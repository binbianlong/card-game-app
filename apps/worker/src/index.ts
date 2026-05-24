import { getServerByName, routePartykitRequest, Server, type Connection } from "partyserver";
import { ClientEventSchema, type ClientEvent, type RoomState } from "schema";
import { createErrorEvent, createRoomStateEvent, createWorkerApp, parseRoomState } from "./app.ts";
import { RoomStateError, applyRoomClientEvent, createFallbackRoom } from "./room-state.ts";

type Env = {
  RoomServer: DurableObjectNamespace<RoomServer>;
};

const app = createWorkerApp<Env>({
  async saveRoom(env, roomId, room) {
    const server = await getServerByName(env.RoomServer, roomId);
    const response = await server.fetch(
      new Request("https://room-server.internal/state", {
        body: JSON.stringify(room),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }),
    );

    return response.ok;
  },
});

export class RoomServer extends Server<Env> {
  static override options = {
    hibernate: true,
  };

  async onConnect(connection: Connection) {
    const room = await this.getRoom();
    connection.send(JSON.stringify(createRoomStateEvent(room)));
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

      return Response.json(room);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async applyClientEvent(event: ClientEvent) {
    const room = await this.getRoom();
    return this.setRoom(applyRoomClientEvent(room, event));
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
