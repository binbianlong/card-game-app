import { Hono } from "hono";
import { validator } from "hono/validator";
import {
  ClientEventSchema,
  CreateConnectionTicketRequestSchema,
  CreateConnectionTicketResponseSchema,
  CreateRoomResponseSchema,
  JoinRoomResponseSchema,
  ReconnectRoomResponseSchema,
  ReconnectableRoomsResponseSchema,
  RoomHistoryResponseSchema,
  RoomMatchHistoryResponseSchema,
  createServerEvent,
  getRoomWebSocketPath,
  type ClientEvent,
  type MatchHistoryItem,
  type ReconnectRoomResponse,
  type ReconnectableRoom,
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
  createConnectionTicket: (
    env: Env,
    roomId: string,
    request: {
      connectionToken: string;
      playerId: string;
    },
  ) => Promise<string | null>;
  endRoom: (env: Env, roomId: string, userId: string) => Promise<RoomState | null>;
  findRoomByInviteCode: (env: Env, inviteCode: string) => Promise<RoomMetadata | null>;
  listReconnectableRooms: (env: Env, userId: string) => Promise<readonly ReconnectableRoom[]>;
  reconnectRoom: (
    env: Env,
    roomId: string,
    userId: string,
  ) => Promise<ReconnectRoomResponse | null>;
  getSessionUser: (env: Env, request: Request) => Promise<AuthenticatedUser | null>;
  joinRoom: (
    env: Env,
    roomId: string,
    event: Extract<ClientEvent, { type: "joinRoom" }>,
    user: AuthenticatedUser | null,
  ) => Promise<Response>;
  getRoomHistory: (env: Env, roomId: string, userId: string) => Promise<RoomHistoryItem | null>;
  listMatchHistory: (
    env: Env,
    roomId: string,
    userId: string,
  ) => Promise<readonly MatchHistoryItem[]>;
  listRoomHistory: (env: Env, userId: string) => Promise<readonly RoomHistoryItem[]>;
  saveRoom: (env: Env, roomId: string, room: RoomState, userId: string) => Promise<string | null>;
};

function createRoomsRoute<Env extends WorkerBindings>({
  createConnectionTicket,
  endRoom,
  findRoomByInviteCode,
  getRoomHistory,
  getSessionUser,
  joinRoom,
  listReconnectableRooms,
  listMatchHistory,
  listRoomHistory,
  reconnectRoom,
  saveRoom,
}: RoomsRouteOptions<Env>) {
  const route = new Hono<{ Bindings: Env }>()
    .get("/reconnectable", async (context) => {
      const env = context.env as Env;
      const user = await getSessionUser(env, context.req.raw);

      if (user === null) {
        return context.json(createLoginRequiredError("reconnect rooms"), 401);
      }

      const rooms = await listReconnectableRooms(env, user.id);

      return context.json(ReconnectableRoomsResponseSchema.parse({ rooms }));
    })

    .get("/history", async (context) => {
      const env = context.env as Env;
      const user = await getSessionUser(env, context.req.raw);

      if (user === null) {
        return context.json(createLoginRequiredError("view match history"), 401);
      }

      const rooms = await listRoomHistory(env, user.id);

      return context.json(RoomHistoryResponseSchema.parse({ rooms }));
    })

    .get("/history/:roomKey", async (context) => {
      const env = context.env as Env;
      const user = await getSessionUser(env, context.req.raw);

      if (user === null) {
        return context.json(createLoginRequiredError("view match history"), 401);
      }

      const roomKey = context.req.param("roomKey");
      const room = await getRoomHistory(env, roomKey, user.id);

      if (room === null) {
        return context.json(createErrorEvent("roomNotFound", "Room was not found."), 404);
      }

      const matches = await listMatchHistory(env, room.id, user.id);

      return context.json(RoomMatchHistoryResponseSchema.parse({ room, matches }));
    })

    .post(
      "/",
      createClientEventValidator("createRoom", "createRoom event is required."),
      async (context) => {
        const env = context.env as Env;
        const user = await getSessionUser(env, context.req.raw);

        if (user === null) {
          return context.json(createLoginRequiredError("create rooms"), 401);
        }

        const event = context.req.valid("json");
        const inviteCode = await createAvailableInviteCode(env, findRoomByInviteCode);
        if (inviteCode === null) {
          return context.json(createErrorEvent("internalError", "Failed to create room."), 500);
        }

        const roomId = createRoomId();
        const room = createWaitingRoom(event, roomId, inviteCode);
        const connectionToken = await saveRoom(env, roomId, room, user.id);

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
        const user = await getSessionUser(env, context.req.raw);

        if (user === null) {
          return context.json(createLoginRequiredError("join rooms"), 401);
        }

        const event = context.req.valid("json");
        const inviteCode = normalizeInviteCode(event.roomId);
        const roomMetadata = await findRoomByInviteCode(env, inviteCode);

        if (roomMetadata === null) {
          return context.json(createErrorEvent("roomNotFound", "Room was not found."), 404);
        }

        const response = await joinRoom(
          env,
          roomMetadata.id,
          {
            ...event,
            roomId: roomMetadata.id,
          },
          user,
        );

        if (!response.ok) {
          return response;
        }

        return context.json(JoinRoomResponseSchema.parse(await response.json()));
      },
    )

    .post("/:roomId/ticket", createConnectionTicketRequestValidator(), async (context) => {
      const request = context.req.valid("json");
      const env = context.env as Env;
      const ticket = await createConnectionTicket(env, context.req.param("roomId"), request);

      if (ticket === null) {
        return context.json(createErrorEvent("notAllowed", "Connection token is invalid."), 403);
      }

      return context.json(CreateConnectionTicketResponseSchema.parse({ ticket }));
    })

    .post("/:roomId/reconnect", async (context) => {
      const env = context.env as Env;
      const user = await getSessionUser(env, context.req.raw);

      if (user === null) {
        return context.json(createLoginRequiredError("reconnect rooms"), 401);
      }

      const data = await reconnectRoom(env, context.req.param("roomId"), user.id);

      if (data === null) {
        return context.json(createErrorEvent("notAllowed", "Cannot reconnect to this room."), 403);
      }

      return context.json(ReconnectRoomResponseSchema.parse(data));
    })

    .delete("/:roomId", async (context) => {
      const env = context.env as Env;
      const user = await getSessionUser(env, context.req.raw);

      if (user === null) {
        return context.json(createLoginRequiredError("end rooms"), 401);
      }

      const room = await endRoom(env, context.req.param("roomId"), user.id);

      if (room === null) {
        return context.json(
          createErrorEvent("notAllowed", "Only the host can end this room."),
          403,
        );
      }

      return context.json({ room });
    });

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

function createConnectionTicketRequestValidator() {
  return validator("json", (body, context) => {
    const request = CreateConnectionTicketRequestSchema.safeParse(body);

    if (!request.success) {
      return context.json(
        createErrorEvent("invalidEvent", "Connection ticket request is required."),
        400,
      );
    }

    return request.data;
  });
}

function createErrorEvent(code: ServerErrorCode, message: string) {
  return createServerEvent.error(code, message);
}

function createLoginRequiredError(action: string) {
  return createErrorEvent("notAllowed", `Login is required to ${action}.`);
}

async function createAvailableInviteCode<Env extends WorkerBindings>(
  env: Env,
  findRoomByInviteCode: RoomsRouteOptions<Env>["findRoomByInviteCode"],
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = createInviteCode();

    if ((await findRoomByInviteCode(env, inviteCode)) === null) {
      return inviteCode;
    }
  }

  return null;
}

function createRoomId() {
  return crypto.randomUUID();
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().replace(/\s|-/g, "").toUpperCase();
}

export { createRoomsRoute };
export type { RoomMetadata, RoomsRouteOptions };
export type RoomsRoute = ReturnType<typeof createRoomsRoute<WorkerBindings>>;
