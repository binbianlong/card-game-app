import { Hono } from "hono";
import {
  ClientEventSchema,
  RoomStateSchema,
  createServerEvent,
  getRoomWebSocketPath,
  type ClientEvent,
  type GameRuleSettings,
  type RoomParticipant,
  type RoomState,
  type ServerErrorCode,
} from "schema";

type WorkerBindings = {
  RoomServer: DurableObjectNamespace;
};

type CreateWorkerAppOptions<Env extends WorkerBindings> = {
  saveRoom: (env: Env, roomId: string, room: RoomState) => Promise<boolean>;
};

const defaultRules: GameRuleSettings = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  sequence: true,
  suitLock: true,
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

function createWaitingRoom(
  event: Extract<ClientEvent, { type: "createRoom" }>,
  roomId: string,
  inviteCode: string,
): RoomState {
  const host: RoomParticipant = {
    id: "player-1",
    name: event.playerName,
    kind: "host",
    connected: true,
    ready: false,
  };
  const cpuParticipants = Array.from(
    { length: event.cpuCount },
    (_, index): RoomParticipant => ({
      id: `cpu-${index + 1}`,
      name: `CPU ${index + 1}`,
      kind: "cpu",
      connected: true,
      ready: true,
    }),
  );

  return {
    id: roomId,
    inviteCode,
    status: "waiting",
    hostPlayerId: host.id,
    participants: [host, ...cpuParticipants],
    rules: event.rules,
    game: null,
  };
}

function createFallbackRoom(roomId: string): RoomState {
  return {
    id: roomId,
    inviteCode: createInviteCode(roomId),
    status: "waiting",
    hostPlayerId: "player-1",
    participants: [
      {
        id: "player-1",
        name: "Host",
        kind: "host",
        connected: true,
        ready: false,
      },
    ],
    rules: defaultRules,
    game: null,
  };
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

function createInviteCode(roomId: string) {
  return roomId.replaceAll("-", "").slice(0, 4).toUpperCase();
}

function createPlayerId(participants: readonly RoomParticipant[]) {
  return `player-${participants.length + 1}`;
}

export {
  createErrorEvent,
  createFallbackRoom,
  createPlayerId,
  createRoomStateEvent,
  createWorkerApp,
  parseRoomState,
};
