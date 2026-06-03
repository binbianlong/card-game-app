import { Hono } from "hono";
import { validator } from "hono/validator";
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
  RoomServer: unknown;
};

type RoomMetadata = {
  id: string;
  inviteCode: string;
};

type AuthenticatedUser = {
  id: string;
};

type RoomsRouteOptions<Env extends WorkerBindings> = {
  findRoomByInviteCode: (env: Env, inviteCode: string) => Promise<RoomMetadata | null>;
  getSessionUser: (env: Env, request: Request) => Promise<AuthenticatedUser | null>;
  joinRoom: (
    env: Env,
    roomId: string,
    event: Extract<ClientEvent, { type: "joinRoom" }>,
  ) => Promise<Response>;
  getRoomHistory: (env: Env, roomId: string) => Promise<RoomHistoryItem | null>;
  listMatchHistory: (env: Env, roomId: string) => Promise<readonly MatchHistoryItem[]>;
  listRoomHistory: (env: Env) => Promise<readonly RoomHistoryItem[]>;
  saveRoom: (env: Env, roomId: string, room: RoomState) => Promise<string | null>;
};

function createRoomsRoute<Env extends WorkerBindings>({
  findRoomByInviteCode,
  getRoomHistory,
  getSessionUser,
  joinRoom,
  listMatchHistory,
  listRoomHistory,
  saveRoom,
}: RoomsRouteOptions<Env>) {
  const route = new Hono<{ Bindings: Env }>()
    .get("/history", async (context) => {
      const rooms = await listRoomHistory(context.env);

      return context.json(RoomHistoryResponseSchema.parse({ rooms }));
    })

    .get("/history/:inviteCode", async (context) => {
      const inviteCode = context.req.param("inviteCode");
      const room = await getRoomHistory(context.env, inviteCode);

      if (room === null) {
        return context.json(createErrorEvent("roomNotFound", "Room was not found."), 404);
      }

      const matches = await listMatchHistory(context.env, room.id);

      return context.json(RoomMatchHistoryResponseSchema.parse({ room, matches }));
    })

    .post(
      "/",
      createClientEventValidator("createRoom", "createRoom event is required."),
      async (context) => {
        const env = context.env as Env;
        const user = await getSessionUser(env, context.req.raw);

        if (user === null) {
          return context.json(
            createErrorEvent("notAllowed", "Login is required to create rooms."),
            401,
          );
        }

        const event = context.req.valid("json");
        const roomId = createRoomId();
        const inviteCode = createInviteCode(roomId);
        const room = createWaitingRoom(event, roomId, inviteCode);
        const connectionToken = await saveRoom(env, roomId, room);

        if (connectionToken === null) {
          return context.json(createErrorEvent("internalError", "Failed to create room."), 500);
        }

        return context.json(
          CreateRoomResponseSchema.parse({
            connectionToken,
            room,
            websocketPath: getRoomWebSocketPath(roomId),
          }),
        );
      },
    )

    .post(
      "/join",
      createClientEventValidator("joinRoom", "joinRoom event is required."),
      async (context) => {
        const env = context.env as Env;
        const event = context.req.valid("json");
        const inviteCode = normalizeInviteCode(event.roomId);
        const roomMetadata = await findRoomByInviteCode(env, inviteCode);

        if (roomMetadata === null) {
          return context.json(createErrorEvent("roomNotFound", "Room was not found."), 404);
        }

        const response = await joinRoom(env, roomMetadata.id, {
          ...event,
          roomId: roomMetadata.id,
        });

        if (!response.ok) {
          return response;
        }

        return context.json(JoinRoomResponseSchema.parse(await response.json()));
      },
    );

  return route;
}

function createClientEventValidator<Type extends ClientEvent["type"]>(type: Type, message: string) {
  return validator("json", (body, context) => {
    const event = ClientEventSchema.safeParse(body);

    if (!event.success || event.data.type !== type) {
      return context.json(createErrorEvent("invalidEvent", message), 400);
    }

    return event.data as Extract<ClientEvent, { type: Type }>;
  });
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
export type RoomsRoute = ReturnType<typeof createRoomsRoute<WorkerBindings>>;
