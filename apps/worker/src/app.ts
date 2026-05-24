import { Hono } from "hono";
import {
  ClientEventSchema,
  RoomStateSchema,
  createServerEvent,
  getRoomWebSocketPath,
  type RoomState,
  type ServerErrorCode,
} from "schema";
import { createInviteCode, createWaitingRoom } from "./room-state.ts";

type WorkerBindings = {
  RoomServer: DurableObjectNamespace;
};

type CreateWorkerAppOptions<Env extends WorkerBindings> = {
  saveRoom: (env: Env, roomId: string, room: RoomState) => Promise<boolean>;
};

function createWorkerApp<Env extends WorkerBindings>({ saveRoom }: CreateWorkerAppOptions<Env>) {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "card-game-app-worker",
    }),
  );

  app.post("/api/rooms", async (context) => {
    const body = await context.req.json().catch(() => null);
    const event = ClientEventSchema.safeParse(body);

    if (!event.success || event.data.type !== "createRoom") {
      return context.json(createErrorEvent("invalidEvent", "createRoom event is required."), 400);
    }

    const roomId = createRoomId();
    const inviteCode = createInviteCode(roomId);
    const room = createWaitingRoom(event.data, roomId, inviteCode);
    const saved = await saveRoom(context.env, roomId, room);

    if (!saved) {
      return context.json(createErrorEvent("internalError", "Failed to create room."), 500);
    }

    return context.json({
      room,
      websocketPath: getRoomWebSocketPath(roomId),
    });
  });

  return app;
}

function createRoomStateEvent(room: RoomState) {
  return createServerEvent.roomState(room);
}

function createErrorEvent(code: ServerErrorCode, message: string) {
  return createServerEvent.error(code, message);
}

function parseRoomState(value: unknown) {
  return RoomStateSchema.parse(value);
}

function createRoomId() {
  return crypto.randomUUID();
}

export { createErrorEvent, createRoomStateEvent, createWorkerApp, parseRoomState };
