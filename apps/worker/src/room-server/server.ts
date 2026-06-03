import { Server, type Connection } from "partyserver";
import { ClientEventSchema, getRoomWebSocketPath, type ClientEvent, type RoomState } from "schema";
import { createErrorEvent, createRoomStateEvent, parseRoomState } from "../app.ts";
import {
  RoomStateError,
  applyNextCpuTurn,
  applyRoomClientEvent,
  createFallbackRoom,
  isCpuTurn,
} from "../rooms/state.ts";
import { createRoomRepository } from "../rooms/repository.ts";
import { validateConnectionEvent } from "./connection-event.ts";

type RoomServerEnv = {
  DB?: D1Database;
  RoomServer: DurableObjectNamespace<RoomServer>;
};

const cpuTurnDelayMs = 900;

class RoomServer extends Server<RoomServerEnv> {
  static override options = {
    hibernate: true,
  };

  async onConnect(connection: Connection) {
    const room = await this.getRoom();
    connection.send(JSON.stringify(createRoomStateEvent(room)));
    await this.scheduleCpuTurn(room);
  }

  async onMessage(connection: Connection, message: string | ArrayBuffer | ArrayBufferView) {
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

    this.broadcast(JSON.stringify(createRoomStateEvent(room)));
    await this.scheduleCpuTurn(room);
  }

  async onRequest(request: Request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/state") {
      return Response.json(await this.getRoom());
    }

    if (request.method === "PUT" && url.pathname === "/state") {
      const body = await request.json().catch(() => null);
      const room = parseRoomState(body);

      await this.setRoom(room);
      await this.scheduleCpuTurn(room);

      return Response.json(room);
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

      this.broadcast(JSON.stringify(createRoomStateEvent(nextRoom)));
      await this.scheduleCpuTurn(nextRoom);

      return Response.json({
        playerId,
        room: nextRoom,
        websocketPath: getRoomWebSocketPath(nextRoom.id),
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
      this.broadcast(JSON.stringify(createRoomStateEvent(nextRoom)));
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
