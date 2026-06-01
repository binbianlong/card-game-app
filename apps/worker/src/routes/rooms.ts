import { Hono } from "hono";
import {
  ClientEventSchema,
  CreateRoomResponseSchema,
  JoinRoomResponseSchema,
  RoomHistoryResponseSchema,
  RoomMatchHistoryResponseSchema,
  createServerEvent,
  getRoomWebSocketPath,
  type ClientEvent,
  type MatchHistoryItem,
  type RoomHistoryItem,
  type RoomState,
  type ServerErrorCode,
} from "schema";
import { createInviteCode, createWaitingRoom } from "../rooms/state.ts";

type WorkerBindings = {
  RoomServer: DurableObjectNamespace;
};

type RoomMetadata = {
  id: string;
  inviteCode: string;
};

type RoomsRouteOptions<Env extends WorkerBindings> = {
  findRoomByInviteCode: (env: Env, inviteCode: string) => Promise<RoomMetadata | null>;
  joinRoom: (
    env: Env,
    roomId: string,
    event: Extract<ClientEvent, { type: "joinRoom" }>,
  ) => Promise<Response>;
  getRoomHistory: (env: Env, roomId: string) => Promise<RoomHistoryItem | null>;
  listMatchHistory: (env: Env, roomId: string) => Promise<readonly MatchHistoryItem[]>;
  listRoomHistory: (env: Env) => Promise<readonly RoomHistoryItem[]>;
  saveRoom: (env: Env, roomId: string, room: RoomState) => Promise<boolean>;
};

function createRoomsRoute<Env extends WorkerBindings>({
  findRoomByInviteCode,
  getRoomHistory,
  joinRoom,
  listMatchHistory,
  listRoomHistory,
  saveRoom,
}: RoomsRouteOptions<Env>) {
  const route = new Hono<{ Bindings: Env }>();

  route.get("/history", async (context) => {
    const rooms = await listRoomHistory(context.env);

    return context.json(RoomHistoryResponseSchema.parse({ rooms }));
  });

  route.get("/history/:inviteCode", async (context) => {
    const inviteCode = context.req.param("inviteCode");
    const room = await getRoomHistory(context.env, inviteCode);

    if (room === null) {
      return context.json(createErrorEvent("roomNotFound", "Room was not found."), 404);
    }

    const matches = await listMatchHistory(context.env, room.id);

    return context.json(RoomMatchHistoryResponseSchema.parse({ room, matches }));
  });

  route.post("/", async (context) => {
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

  route.post("/join", async (context) => {
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

  return route;
}

function createErrorEvent(code: ServerErrorCode, message: string) {
  return createServerEvent.error(code, message);
}

function createRoomId() {
  return createInviteCode(crypto.randomUUID());
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().replace(/\s|-/g, "").toUpperCase();
}

export { createRoomsRoute };
export type { RoomMetadata, RoomsRouteOptions };
