import { Server, type Connection, type ConnectionContext } from "partyserver";
import { ClientEventSchema, type ClientEvent, type RoomState } from "schema";
import { createErrorEvent, createRoomStateEvent } from "../app.ts";
import {
  RoomStateError,
  applyNextCpuTurn,
  applyRoomClientEvent,
  applyRoomConnectionChange,
  createFallbackRoom,
  isCpuTurn,
} from "../rooms/state.ts";
import { createRoomRepository } from "../rooms/repository.ts";
import { validateConnectionEvent } from "./connection-event.ts";
import {
  consumeConnectionTicket,
  setConnectionTicket as createConnectionTicket,
} from "./connection-ticket.ts";
import {
  setConnectionToken as createConnectionToken,
  validateStoredConnectionToken,
} from "./connection-token.ts";
import {
  getDisconnectedPlayerCpuAlarmTime,
  isDisconnectedPlayerCpuControlled,
} from "./disconnected-player.ts";
import { handleInternalRoomRequest } from "./internal-room-handler.ts";

type RoomServerEnv = {
  DB?: D1Database;
  RoomServer: DurableObjectNamespace<RoomServer>;
  ROOM_SERVER_SECRET?: string;
};

type RoomConnectionState = {
  connectionToken: string;
};

const cpuTurnDelayMs = 900;
const roomInactivityTtlMs = 24 * 60 * 60 * 1000;
const finishedRoomExpiresAtKey = "finishedRoomExpiresAt";

class RoomServer extends Server<RoomServerEnv> {
  static override options = {
    hibernate: true,
  };

  async onConnect(connection: Connection<RoomConnectionState>, context: ConnectionContext) {
    const ticketResult = await this.consumeConnectionTicket(connection.id, context.request);

    if (!ticketResult.ok) {
      connection.send(
        JSON.stringify(createErrorEvent(ticketResult.error.code, ticketResult.error.message)),
      );
      connection.close(1008, ticketResult.error.message);
      return;
    }

    connection.setState({ connectionToken: ticketResult.connectionToken });

    const room = await this.markPlayerConnected(connection.id);
    this.sendRoomState(connection, room);
    this.sendRoomStateToConnections(room);
    await this.scheduleCpuTurn(room);
  }

  async onClose(connection: Connection<RoomConnectionState>) {
    if (connection.state?.connectionToken === undefined) {
      return;
    }

    if (this.hasActivePlayerConnection(connection.id, connection)) {
      return;
    }

    const room = await this.markPlayerDisconnected(connection.id);
    this.sendRoomStateToConnections(room);
    await this.scheduleCpuTurn(room);
  }

  async onMessage(
    connection: Connection<RoomConnectionState>,
    message: string | ArrayBuffer | ArrayBufferView,
  ) {
    const tokenError = await this.validateConnectionToken(
      connection.id,
      connection.state?.connectionToken ?? null,
    );

    if (tokenError !== null) {
      connection.send(JSON.stringify(createErrorEvent(tokenError.code, tokenError.message)));
      connection.close(1008, tokenError.message);
      return;
    }

    if (typeof message !== "string") {
      connection.send(JSON.stringify(createErrorEvent("invalidEvent", "Text messages only.")));
      return;
    }

    const body = parseMessage(message);
    const event = ClientEventSchema.safeParse(body);

    if (!event.success) {
      connection.send(JSON.stringify(createErrorEvent("invalidEvent", "Invalid client event.")));
      return;
    }

    const connectionEventError = validateConnectionEvent(connection.id, event.data);

    if (connectionEventError !== null) {
      connection.send(
        JSON.stringify(createErrorEvent(connectionEventError.code, connectionEventError.message)),
      );
      return;
    }

    const room = await this.applyClientEvent(event.data).catch((error: unknown) => {
      if (error instanceof RoomStateError) {
        connection.send(JSON.stringify(createErrorEvent(error.code, error.message)));
        return null;
      }

      throw error;
    });

    if (room === null) {
      return;
    }

    this.sendRoomStateToConnections(room);
    await this.scheduleCpuTurn(room);
  }

  async onRequest(request: Request) {
    return handleInternalRoomRequest({
      handler: {
        applyClientEvent: (event) => this.applyClientEvent(event),
        endRoom: () => this.endRoom(),
        getRoom: () => this.getRoom(),
        getStoredRoom: () => this.getStoredRoom(),
        scheduleCpuTurn: (room) => this.scheduleCpuTurn(room),
        sendRoomStateToConnections: (room) => this.sendRoomStateToConnections(room),
        setConnectionTicket: (ticketRequest) => this.setConnectionTicket(ticketRequest),
        setConnectionToken: (playerId) => this.setConnectionToken(playerId),
        setRoom: (room) => this.setRoom(room),
        validateConnectionToken: (playerId, requestToken) =>
          this.validateConnectionToken(playerId, requestToken),
      },
      request,
      secret: this.env.ROOM_SERVER_SECRET,
    });
  }

  private async applyClientEvent(event: ClientEvent) {
    const previousRoom = await this.getRoom();
    const nextRoom = await this.setRoom(applyRoomClientEvent(previousRoom, event));
    await this.saveRoomMetadata(previousRoom, nextRoom);

    return nextRoom;
  }

  async onAlarm() {
    const room = await this.getRoom();

    if (await this.shouldExpireFinishedRoom(room, Date.now())) {
      const nextRoom = await this.endRoom();
      await this.saveEndedRoom(nextRoom);
      return;
    }

    const cpuControlledPlayerIds = await this.getCpuControlledPlayerIds(room);
    const nextRoom = await this.setRoom(applyNextCpuTurn(room, { cpuControlledPlayerIds }));
    await this.saveRoomMetadata(room, nextRoom);

    if (nextRoom !== room) {
      this.sendRoomStateToConnections(nextRoom);
    }

    await this.scheduleCpuTurn(nextRoom);
  }

  private async getRoom() {
    const storedRoom = await this.getStoredRoom();

    if (storedRoom !== undefined) {
      return storedRoom;
    }

    const room = createFallbackRoom(this.name);
    await this.setRoom(room);

    return room;
  }

  private async getStoredRoom() {
    return this.ctx.storage.get<RoomState>("room");
  }

  private async setRoom(room: RoomState) {
    await this.ctx.storage.put("room", room);
    return room;
  }

  private async markPlayerConnected(playerId: string) {
    await this.clearPlayerDisconnectedAt(playerId);

    const room = await this.getRoom();
    return this.setRoom(applyRoomConnectionChange(room, playerId, true));
  }

  private async endRoom() {
    const room = await this.getRoom();
    const nextRoom = await this.setRoom({
      ...room,
      status: "finished",
      participants: room.participants.map((participant) => ({
        ...participant,
        connected: false,
        ready: false,
      })),
      game: null,
    });

    this.sendRoomStateToConnections(nextRoom);
    await this.ctx.storage.delete(finishedRoomExpiresAtKey);
    await this.ctx.storage.deleteAlarm();

    return nextRoom;
  }

  private async markPlayerDisconnected(playerId: string) {
    await this.setPlayerDisconnectedAt(playerId, Date.now());

    const room = await this.getRoom();
    return this.setRoom(applyRoomConnectionChange(room, playerId, false));
  }

  private sendRoomState(connection: Connection, room: RoomState) {
    connection.send(JSON.stringify(createRoomStateEvent(room, connection.id)));
  }

  private sendRoomStateToConnections(room: RoomState) {
    for (const connection of this.getConnections()) {
      this.sendRoomState(connection, room);
    }
  }

  private async setConnectionToken(playerId: string) {
    const connectionToken = await createConnectionToken(this.ctx.storage, playerId);

    this.closeStalePlayerConnections(playerId, connectionToken);

    return connectionToken;
  }

  private async setConnectionTicket({
    connectionToken,
    playerId,
  }: {
    connectionToken: string;
    playerId: string;
  }) {
    return createConnectionTicket(this.ctx.storage, { connectionToken, playerId });
  }

  private async consumeConnectionTicket(playerId: string, request: Request) {
    return consumeConnectionTicket({
      playerId,
      request,
      storage: this.ctx.storage,
      validateConnectionToken: (ticketPlayerId, requestToken) =>
        this.validateConnectionToken(ticketPlayerId, requestToken),
    });
  }

  private async validateConnectionToken(playerId: string, requestToken: string | null) {
    return validateStoredConnectionToken({
      playerId,
      requestToken,
      room: await this.getRoom(),
      storage: this.ctx.storage,
    });
  }

  private closeStalePlayerConnections(playerId: string, activeConnectionToken: string) {
    for (const connection of this.getConnections<RoomConnectionState>(playerId)) {
      if (connection.state?.connectionToken === activeConnectionToken) {
        continue;
      }

      const error = createErrorEvent("notAllowed", "Connection token has been rotated.");
      connection.send(JSON.stringify(error));
      connection.close(1008, error.message);
    }
  }

  private hasActivePlayerConnection(
    playerId: string,
    closedConnection: Connection<RoomConnectionState>,
  ) {
    for (const connection of this.getConnections<RoomConnectionState>(playerId)) {
      if (connection !== closedConnection) {
        return true;
      }
    }

    return false;
  }

  private async saveRoomMetadata(previousRoom: RoomState, nextRoom: RoomState) {
    if (!shouldSaveRoomMetadata(previousRoom, nextRoom)) {
      return;
    }

    if (this.env.DB === undefined) {
      return;
    }

    try {
      await createRoomRepository(this.env.DB).saveRoomMetadata(nextRoom);
    } catch (error) {
      console.error("Failed to save room metadata.", error);
    }
  }

  private async saveEndedRoom(room: RoomState) {
    if (this.env.DB === undefined) {
      return;
    }

    try {
      await createRoomRepository(this.env.DB).saveRoomMetadata(room);
    } catch (error) {
      console.error("Failed to save ended room metadata.", error);
    }
  }

  private async scheduleCpuTurn(room: RoomState) {
    const now = Date.now();

    if (room.status === "finished" && room.game?.phase === "finished") {
      const expiresAt = await this.getFinishedRoomExpiresAt(now);
      await this.ctx.storage.setAlarm(expiresAt);
      return;
    }

    await this.ctx.storage.delete(finishedRoomExpiresAtKey);

    const cpuControlledPlayerIds = await this.getCpuControlledPlayerIds(room, now);

    if (isCpuTurn(room, { cpuControlledPlayerIds })) {
      await this.ctx.storage.setAlarm(Date.now() + cpuTurnDelayMs);
      return;
    }

    if (room.status === "playing" && room.game?.phase === "playing") {
      const disconnectedAt = await this.getPlayerDisconnectedAt(room.game.turnPlayerId);

      if (disconnectedAt !== undefined) {
        await this.ctx.storage.setAlarm(getDisconnectedPlayerCpuAlarmTime(disconnectedAt));
        return;
      }
    }

    await this.ctx.storage.deleteAlarm();
  }

  private async getFinishedRoomExpiresAt(now: number) {
    const storedExpiresAt = await this.ctx.storage.get<number>(finishedRoomExpiresAtKey);

    if (storedExpiresAt !== undefined) {
      return storedExpiresAt;
    }

    const expiresAt = now + roomInactivityTtlMs;
    await this.ctx.storage.put(finishedRoomExpiresAtKey, expiresAt);

    return expiresAt;
  }

  private async shouldExpireFinishedRoom(room: RoomState, now: number) {
    if (room.status !== "finished" || room.game?.phase !== "finished") {
      return false;
    }

    const expiresAt = await this.ctx.storage.get<number>(finishedRoomExpiresAtKey);

    return expiresAt !== undefined && expiresAt <= now;
  }

  private async getCpuControlledPlayerIds(room: RoomState, now = Date.now()) {
    const playerIds: string[] = [];

    for (const participant of room.participants) {
      if (participant.kind === "cpu") {
        continue;
      }

      const disconnectedAt = await this.getPlayerDisconnectedAt(participant.id);

      if (
        disconnectedAt !== undefined &&
        isDisconnectedPlayerCpuControlled({ disconnectedAt, now })
      ) {
        playerIds.push(participant.id);
      }
    }

    return playerIds;
  }

  private getPlayerDisconnectedAt(playerId: string) {
    return this.ctx.storage.get<number>(createPlayerDisconnectedAtKey(playerId));
  }

  private async setPlayerDisconnectedAt(playerId: string, disconnectedAt: number) {
    await this.ctx.storage.put(createPlayerDisconnectedAtKey(playerId), disconnectedAt);
  }

  private async clearPlayerDisconnectedAt(playerId: string) {
    await this.ctx.storage.delete(createPlayerDisconnectedAtKey(playerId));
  }
}

function shouldSaveRoomMetadata(previousRoom: RoomState, nextRoom: RoomState) {
  return previousRoom.status !== nextRoom.status;
}

function parseMessage(message: string) {
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
}

function createPlayerDisconnectedAtKey(playerId: string) {
  return `playerDisconnectedAt:${playerId}`;
}

export { RoomServer };
export type { RoomServerEnv };
