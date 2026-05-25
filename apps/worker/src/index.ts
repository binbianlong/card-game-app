import { getServerByName, routePartykitRequest, Server, type Connection } from "partyserver";
import {
  ClientEventSchema,
  JoinRoomResponseSchema,
  getRoomWebSocketPath,
  type ClientEvent,
  type RoomState,
} from "schema";
import { createErrorEvent, createRoomStateEvent, createWorkerApp, parseRoomState } from "./app.ts";
import {
  RoomStateError,
  applyNextCpuTurn,
  applyRoomClientEvent,
  createFallbackRoom,
  isCpuTurn,
} from "./room-state.ts";
import { createRoomRepository } from "./room-repository.ts";

type Env = {
  DB: D1Database;
  RoomServer: DurableObjectNamespace<RoomServer>;
};

const cpuTurnDelayMs = 900;

const app = createWorkerApp<Env>({
  async findRoomByInviteCode(env, inviteCode) {
    return createRoomRepository(env.DB).findRoomByInviteCode(inviteCode);
  },
  async joinRoom(env, roomId, event) {
    const server = await getServerByName(env.RoomServer, roomId);

    const response = await server.fetch(
      new Request("https://room-server.internal/join", {
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    if (response.ok) {
      const data = JoinRoomResponseSchema.parse(await response.clone().json());
      await createRoomRepository(env.DB).saveRoomMetadata(data.room);
    }

    return response;
  },
  async saveRoom(env, roomId, room) {
    const server = await getServerByName(env.RoomServer, roomId);
    const response = await server.fetch(
      new Request("https://room-server.internal/state", {
        body: JSON.stringify(room),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }),
    );

    if (!response.ok) {
      return false;
    }

    await createRoomRepository(env.DB).saveRoomMetadata(room);

    return true;
  },
});

export class RoomServer extends Server<Env> {
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
    const room = await this.getRoom();
    return this.setRoom(applyRoomClientEvent(room, event));
  }

  async onAlarm() {
    const room = await this.getRoom();
    const nextRoom = await this.setRoom(applyNextCpuTurn(room));

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

  private async scheduleCpuTurn(room: RoomState) {
    if (isCpuTurn(room)) {
      await this.ctx.storage.setAlarm(Date.now() + cpuTurnDelayMs);
      return;
    }

    await this.ctx.storage.deleteAlarm();
  }
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const partyResponse = await routePartykitRequest(request, env);

    return partyResponse ?? app.fetch(request, env, context);
  },
} satisfies ExportedHandler<Env>;

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
