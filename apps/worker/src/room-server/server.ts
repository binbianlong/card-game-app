import { Server, type Connection, type ConnectionContext } from "partyserver";
import {
  ClientEventSchema,
  CreateConnectionTicketRequestSchema,
  getRoomWebSocketPath,
  type ClientEvent,
  type RoomState,
} from "schema";
import { createErrorEvent, createRoomStateEvent, parseRoomState } from "../app.ts";
import {
  RoomStateError,
  applyNextCpuTurn,
  applyRoomClientEvent,
  createFallbackRoom,
  isCpuTurn,
} from "../rooms/state.ts";
import { createRoomRepository } from "../rooms/repository.ts";
import {
  validateConnectionEvent,
  validateConnectionToken,
  type ConnectionToken,
} from "./connection-event.ts";
import { validateInternalRoomRequest } from "./internal-request.ts";

type RoomServerEnv = {
  DB?: D1Database;
  RoomServer: DurableObjectNamespace<RoomServer>;
  ROOM_SERVER_SECRET?: string;
};

type RoomConnectionState = {
  connectionToken: string;
};

type ConnectionTicket = {
  connectionToken: string;
  expiresAt: number;
  playerId: string;
};

const cpuTurnDelayMs = 900;
const connectionTicketTtlMs = 30 * 1000;
const connectionTicketsStorageKey = "connectionTickets";
const connectionTokenTtlMs = 60 * 60 * 1000;
const connectionTokensStorageKey = "connectionTokens";

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

    const room = await this.getRoom();
    this.sendRoomState(connection, room);
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
    const url = new URL(request.url);

    const internalRequestValidation = validateInternalRoomRequest(
      request,
      this.env.ROOM_SERVER_SECRET,
    );

    if (!internalRequestValidation.ok) {
      return Response.json(createErrorEvent("notAllowed", internalRequestValidation.message), {
        status: 403,
      });
    }

    if (request.method === "GET" && url.pathname === "/state") {
      return Response.json(await this.getRoom());
    }

    if (request.method === "PUT" && url.pathname === "/state") {
      const body = await request.json().catch(() => null);
      const room = parseRoomState(body);

      await this.setRoom(room);
      const connectionToken = await this.setConnectionToken(room.hostPlayerId);
      await this.scheduleCpuTurn(room);

      return Response.json({
        connectionToken,
        room,
        websocketPath: getRoomWebSocketPath(room.id),
      });
    }

    if (request.method === "POST" && url.pathname === "/join") {
      const storedRoom = await this.ctx.storage.get<RoomState>("room");

      if (storedRoom === undefined) {
        return Response.json(createErrorEvent("roomNotFound", "Room was not found."), {
          status: 404,
        });
      }

      const body = await request.json().catch(() => null);
      const event = ClientEventSchema.safeParse(body);

      if (!event.success || event.data.type !== "joinRoom") {
        return Response.json(createErrorEvent("invalidEvent", "joinRoom event is required."), {
          status: 400,
        });
      }

      const nextRoom = await this.applyClientEvent(event.data).catch((error: unknown) => {
        if (error instanceof RoomStateError) {
          return Response.json(createErrorEvent(error.code, error.message), { status: 400 });
        }

        throw error;
      });

      if (nextRoom instanceof Response) {
        return nextRoom;
      }

      const playerId = getJoinedPlayerId(storedRoom, nextRoom);
      const connectionToken = await this.setConnectionToken(playerId);

      this.sendRoomStateToConnections(nextRoom);
      await this.scheduleCpuTurn(nextRoom);

      return Response.json({
        connectionToken,
        playerId,
        room: nextRoom,
        websocketPath: getRoomWebSocketPath(nextRoom.id),
      });
    }

    if (request.method === "POST" && url.pathname === "/ticket") {
      const body = await request.json().catch(() => null);
      const ticketRequest = CreateConnectionTicketRequestSchema.safeParse(body);

      if (!ticketRequest.success) {
        return Response.json(
          createErrorEvent("invalidEvent", "Connection ticket request is required."),
          {
            status: 400,
          },
        );
      }

      const tokenError = await this.validateConnectionToken(
        ticketRequest.data.playerId,
        ticketRequest.data.connectionToken,
      );

      if (tokenError !== null) {
        return Response.json(createErrorEvent(tokenError.code, tokenError.message), {
          status: 403,
        });
      }

      return Response.json({
        ticket: await this.setConnectionTicket(ticketRequest.data),
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  private async applyClientEvent(event: ClientEvent) {
    const previousRoom = await this.getRoom();
    const nextRoom = await this.setRoom(applyRoomClientEvent(previousRoom, event));
    await this.saveFinishedRoom(previousRoom, nextRoom);

    return nextRoom;
  }

  async onAlarm() {
    const room = await this.getRoom();
    const nextRoom = await this.setRoom(applyNextCpuTurn(room));
    await this.saveFinishedRoom(room, nextRoom);

    if (nextRoom !== room) {
      this.sendRoomStateToConnections(nextRoom);
    }

    await this.scheduleCpuTurn(nextRoom);
  }

  private async getRoom() {
    const storedRoom = await this.ctx.storage.get<RoomState>("room");

    if (storedRoom !== undefined) {
      return storedRoom;
    }

    const room = createFallbackRoom(this.name);
    await this.setRoom(room);

    return room;
  }

  private async setRoom(room: RoomState) {
    await this.ctx.storage.put("room", room);
    return room;
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
    const connectionTokens = await this.getConnectionTokens();
    const connectionToken = {
      expiresAt: Date.now() + connectionTokenTtlMs,
      value: crypto.randomUUID(),
    };

    await this.ctx.storage.put(connectionTokensStorageKey, {
      ...connectionTokens,
      [playerId]: connectionToken,
    });

    this.closeStalePlayerConnections(playerId, connectionToken.value);

    return connectionToken.value;
  }

  private async getConnectionTokens() {
    return (
      (await this.ctx.storage.get<Record<string, ConnectionToken>>(connectionTokensStorageKey)) ??
      {}
    );
  }

  private async setConnectionTicket({
    connectionToken,
    playerId,
  }: {
    connectionToken: string;
    playerId: string;
  }) {
    const tickets = await this.getConnectionTickets();
    const ticket = crypto.randomUUID();
    const now = Date.now();

    await this.ctx.storage.put(connectionTicketsStorageKey, {
      ...removeExpiredConnectionTickets(tickets, now),
      [ticket]: {
        connectionToken,
        expiresAt: now + connectionTicketTtlMs,
        playerId,
      },
    });

    return ticket;
  }

  private async getConnectionTickets() {
    return (
      (await this.ctx.storage.get<Record<string, ConnectionTicket>>(connectionTicketsStorageKey)) ??
      {}
    );
  }

  private async consumeConnectionTicket(playerId: string, request: Request) {
    const requestTicket = getRequestConnectionTicket(request);

    if (requestTicket === null || requestTicket.length === 0) {
      return {
        error: new RoomStateError("notAllowed", "Connection ticket is required."),
        ok: false as const,
      };
    }

    const tickets = await this.getConnectionTickets();
    const now = Date.now();
    const ticket = tickets[requestTicket];
    const nextTickets = removeExpiredConnectionTickets(tickets, now);

    delete nextTickets[requestTicket];
    await this.ctx.storage.put(connectionTicketsStorageKey, nextTickets);

    if (ticket === undefined) {
      return {
        error: new RoomStateError("notAllowed", "Connection ticket is invalid."),
        ok: false as const,
      };
    }

    if (ticket.expiresAt <= now) {
      return {
        error: new RoomStateError("notAllowed", "Connection ticket has expired."),
        ok: false as const,
      };
    }

    if (ticket.playerId !== playerId) {
      return {
        error: new RoomStateError("notAllowed", "Connection ticket does not match the player."),
        ok: false as const,
      };
    }

    const tokenError = await this.validateConnectionToken(playerId, ticket.connectionToken);

    if (tokenError !== null) {
      return {
        error: tokenError,
        ok: false as const,
      };
    }

    return {
      connectionToken: ticket.connectionToken,
      ok: true as const,
    };
  }

  private async validateConnectionToken(playerId: string, requestToken: string | null) {
    const room = await this.getRoom();
    const connectionTokens = await this.getConnectionTokens();

    return validateConnectionToken({
      expectedConnectionToken: connectionTokens[playerId],
      hasParticipant: room.participants.some((participant) => participant.id === playerId),
      now: Date.now(),
      requestConnectionToken: requestToken,
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

  private async saveFinishedRoom(previousRoom: RoomState, nextRoom: RoomState) {
    if (!shouldSaveFinishedRoom(previousRoom, nextRoom)) {
      return;
    }

    if (this.env.DB === undefined) {
      return;
    }

    try {
      await createRoomRepository(this.env.DB).saveRoomMetadata(nextRoom);
    } catch (error) {
      console.error("Failed to save finished room metadata.", error);
    }
  }

  private async scheduleCpuTurn(room: RoomState) {
    if (isCpuTurn(room)) {
      await this.ctx.storage.setAlarm(Date.now() + cpuTurnDelayMs);
      return;
    }

    await this.ctx.storage.deleteAlarm();
  }
}

function shouldSaveFinishedRoom(previousRoom: RoomState, nextRoom: RoomState) {
  return (
    previousRoom.status !== "finished" &&
    nextRoom.status === "finished" &&
    nextRoom.game?.phase === "finished"
  );
}

function parseMessage(message: string) {
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
}

function getRequestConnectionTicket(request: Request) {
  return new URL(request.url).searchParams.get("ticket");
}

function removeExpiredConnectionTickets(tickets: Record<string, ConnectionTicket>, now: number) {
  return Object.fromEntries(Object.entries(tickets).filter(([, ticket]) => ticket.expiresAt > now));
}

function getJoinedPlayerId(previousRoom: RoomState, nextRoom: RoomState) {
  const previousPlayerIds = new Set(previousRoom.participants.map((participant) => participant.id));
  const joinedParticipant = nextRoom.participants.find(
    (participant) => !previousPlayerIds.has(participant.id),
  );

  if (joinedParticipant === undefined) {
    throw new RoomStateError("notAllowed", "Player did not join this room.");
  }

  return joinedParticipant.id;
}

export { RoomServer };
export type { RoomServerEnv };
