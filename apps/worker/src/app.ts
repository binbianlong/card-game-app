import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  ClientEventSchema,
  CreateRoomResponseSchema,
  JoinRoomResponseSchema,
  RoomStateSchema,
  createServerEvent,
  getRoomWebSocketPath,
  type ClientEvent,
  type RoomState,
  type ServerErrorCode,
} from "schema";
import { createInviteCode, createWaitingRoom } from "./room-state.ts";

type WorkerBindings = {
  RoomServer: DurableObjectNamespace;
};

type RoomMetadata = {
  id: string;
  inviteCode: string;
};

type CreateWorkerAppOptions<Env extends WorkerBindings> = {
  findRoomByInviteCode: (env: Env, inviteCode: string) => Promise<RoomMetadata | null>;
  joinRoom: (
    env: Env,
    roomId: string,
    event: Extract<ClientEvent, { type: "joinRoom" }>,
  ) => Promise<Response>;
  saveRoom: (env: Env, roomId: string, room: RoomState) => Promise<boolean>;
};

function createWorkerApp<Env extends WorkerBindings>({
  findRoomByInviteCode,
  joinRoom,
  saveRoom,
}: CreateWorkerAppOptions<Env>) {
  const app = new Hono<{ Bindings: Env }>();

  app.use("/api/*", cors());

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

    return context.json(
      CreateRoomResponseSchema.parse({
        room,
        websocketPath: getRoomWebSocketPath(roomId),
      }),
    );
  });

  app.post("/api/rooms/join", async (context) => {
    const body = await context.req.json().catch(() => null);
    const event = ClientEventSchema.safeParse(body);

    if (!event.success || event.data.type !== "joinRoom") {
      return context.json(createErrorEvent("invalidEvent", "joinRoom event is required."), 400);
    }

    const inviteCode = normalizeInviteCode(event.data.roomId);
    const roomMetadata = await findRoomByInviteCode(context.env, inviteCode);

    if (roomMetadata === null) {
      return context.json(createErrorEvent("roomNotFound", "Room was not found."), 404);
    }

    const response = await joinRoom(context.env, roomMetadata.id, {
      ...event.data,
      roomId: roomMetadata.id,
    });

    if (!response.ok) {
      return response;
    }

    return context.json(JoinRoomResponseSchema.parse(await response.json()));
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
  return createInviteCode(crypto.randomUUID());
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().replace(/\s|-/g, "").toUpperCase();
}

export { createErrorEvent, createRoomStateEvent, createWorkerApp, parseRoomState };
