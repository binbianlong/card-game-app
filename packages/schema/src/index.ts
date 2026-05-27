import { z } from "zod";

export const clientEventTypes = {
  createRoom: "createRoom",
  joinRoom: "joinRoom",
  leaveRoom: "leaveRoom",
  setReady: "setReady",
  updateRules: "updateRules",
  startGame: "startGame",
  playCards: "playCards",
  pass: "pass",
} as const;

export const serverEventTypes = {
  roomState: "roomState",
  playerJoined: "playerJoined",
  playerLeft: "playerLeft",
  gameStarted: "gameStarted",
  actionApplied: "actionApplied",
  error: "error",
} as const;

export const roomPartyName = "room-server";
export const roomPartyPathPrefix = `/parties/${roomPartyName}`;

export const SuitSchema = z.enum(["clubs", "diamonds", "hearts", "spades"]);
export const RankSchema = z.enum([
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
]);

export const CardSchema = z.union([
  z.object({
    id: z.string().min(1),
    rank: RankSchema,
    suit: SuitSchema,
  }),
  z.object({
    id: z.string().min(1),
    rank: z.literal("JOKER"),
    suit: z.literal("joker"),
  }),
]);

export const PlaySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    cards: z.array(CardSchema),
    rank: z.union([RankSchema, z.literal("JOKER")]),
    isEightCut: z.boolean(),
    causesRevolution: z.boolean(),
  }),
  z.object({
    kind: z.literal("set"),
    cards: z.array(CardSchema),
    rank: RankSchema,
    count: z.number().int().positive(),
    isEightCut: z.boolean(),
    causesRevolution: z.boolean(),
  }),
  z.object({
    kind: z.literal("sequence"),
    cards: z.array(CardSchema),
    suit: SuitSchema,
    lowRank: RankSchema,
    highRank: RankSchema,
    count: z.number().int().positive(),
    isEightCut: z.boolean(),
    causesRevolution: z.boolean(),
  }),
]);

export const GameRuleSettingsSchema = z.object({
  eightCut: z.boolean(),
  elevenBack: z.boolean(),
  revolution: z.boolean(),
  sequence: z.boolean(),
  suitLock: z.boolean(),
});

export const PlayerStateSchema = z.object({
  id: z.string().min(1),
  hand: z.array(CardSchema),
  connected: z.boolean(),
});

export const GameStateSchema = z.object({
  phase: z.enum(["playing", "finished"]),
  rules: GameRuleSettingsSchema,
  players: z.array(PlayerStateSchema),
  turnPlayerId: z.string().min(1),
  table: z.object({
    play: PlaySchema.nullable(),
    playedBy: z.string().min(1).nullable(),
  }),
  passedPlayerIds: z.array(z.string().min(1)),
  elevenBack: z.boolean(),
  revolution: z.boolean(),
  suitLock: z.array(SuitSchema).nullable(),
  rankings: z.array(z.string().min(1)),
});

export const RoomParticipantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["host", "guest", "cpu"]),
  connected: z.boolean(),
  ready: z.boolean(),
});

export const RoomStateSchema = z.object({
  id: z.string().min(1),
  inviteCode: z.string().min(1),
  playerCount: z.number().int().min(3).max(6),
  status: z.enum(["waiting", "playing", "finished"]),
  hostPlayerId: z.string().min(1),
  participants: z.array(RoomParticipantSchema),
  rules: GameRuleSettingsSchema,
  game: GameStateSchema.nullable(),
});

export const CreateRoomResponseSchema = z.object({
  room: RoomStateSchema,
  websocketPath: z.string().min(1),
});

export const JoinRoomResponseSchema = z.object({
  playerId: z.string().min(1),
  room: RoomStateSchema,
  websocketPath: z.string().min(1),
});

const RoomPlayerEventBaseSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});

export const ClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(clientEventTypes.createRoom),
    playerName: z.string(),
    playerCount: z.number().int().min(3).max(6),
    cpuCount: z.number().int().min(0).max(5),
    rules: GameRuleSettingsSchema,
  }),
  z.object({
    type: z.literal(clientEventTypes.joinRoom),
    roomId: z.string().min(1),
    playerName: z.string(),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal(clientEventTypes.leaveRoom),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal(clientEventTypes.setReady),
    ready: z.boolean(),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal(clientEventTypes.updateRules),
    rules: GameRuleSettingsSchema,
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal(clientEventTypes.startGame),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal(clientEventTypes.playCards),
    cardIds: z.array(z.string().min(1)).min(1),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal(clientEventTypes.pass),
  }),
]);

export const ServerErrorCodeSchema = z.enum([
  "roomNotFound",
  "roomFull",
  "invalidEvent",
  "notAllowed",
  "gameRuleError",
  "internalError",
]);

export const ServerEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(serverEventTypes.roomState),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal(serverEventTypes.playerJoined),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal(serverEventTypes.playerLeft),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal(serverEventTypes.gameStarted),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal(serverEventTypes.actionApplied),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal(serverEventTypes.error),
    code: ServerErrorCodeSchema,
    message: z.string().min(1),
  }),
]);

type ClientEventByType<Type extends ClientEvent["type"]> = Extract<ClientEvent, { type: Type }>;
type ServerEventByType<Type extends ServerEvent["type"]> = Extract<ServerEvent, { type: Type }>;

export const createClientEvent = {
  createRoom(
    input: Omit<ClientEventByType<typeof clientEventTypes.createRoom>, "type">,
  ): ClientEventByType<typeof clientEventTypes.createRoom> {
    return ClientEventSchema.parse({
      type: clientEventTypes.createRoom,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.createRoom>;
  },
  joinRoom(
    input: Omit<ClientEventByType<typeof clientEventTypes.joinRoom>, "type">,
  ): ClientEventByType<typeof clientEventTypes.joinRoom> {
    return ClientEventSchema.parse({
      type: clientEventTypes.joinRoom,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.joinRoom>;
  },
  leaveRoom(
    input: Omit<ClientEventByType<typeof clientEventTypes.leaveRoom>, "type">,
  ): ClientEventByType<typeof clientEventTypes.leaveRoom> {
    return ClientEventSchema.parse({
      type: clientEventTypes.leaveRoom,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.leaveRoom>;
  },
  setReady(
    input: Omit<ClientEventByType<typeof clientEventTypes.setReady>, "type">,
  ): ClientEventByType<typeof clientEventTypes.setReady> {
    return ClientEventSchema.parse({
      type: clientEventTypes.setReady,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.setReady>;
  },
  updateRules(
    input: Omit<ClientEventByType<typeof clientEventTypes.updateRules>, "type">,
  ): ClientEventByType<typeof clientEventTypes.updateRules> {
    return ClientEventSchema.parse({
      type: clientEventTypes.updateRules,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.updateRules>;
  },
  startGame(
    input: Omit<ClientEventByType<typeof clientEventTypes.startGame>, "type">,
  ): ClientEventByType<typeof clientEventTypes.startGame> {
    return ClientEventSchema.parse({
      type: clientEventTypes.startGame,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.startGame>;
  },
  playCards(
    input: Omit<ClientEventByType<typeof clientEventTypes.playCards>, "type">,
  ): ClientEventByType<typeof clientEventTypes.playCards> {
    return ClientEventSchema.parse({
      type: clientEventTypes.playCards,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.playCards>;
  },
  pass(
    input: Omit<ClientEventByType<typeof clientEventTypes.pass>, "type">,
  ): ClientEventByType<typeof clientEventTypes.pass> {
    return ClientEventSchema.parse({
      type: clientEventTypes.pass,
      ...input,
    }) as ClientEventByType<typeof clientEventTypes.pass>;
  },
};

export const createServerEvent = {
  roomState(room: RoomState): ServerEventByType<typeof serverEventTypes.roomState> {
    return ServerEventSchema.parse({
      type: serverEventTypes.roomState,
      room,
    }) as ServerEventByType<typeof serverEventTypes.roomState>;
  },
  playerJoined(room: RoomState): ServerEventByType<typeof serverEventTypes.playerJoined> {
    return ServerEventSchema.parse({
      type: serverEventTypes.playerJoined,
      room,
    }) as ServerEventByType<typeof serverEventTypes.playerJoined>;
  },
  playerLeft(room: RoomState): ServerEventByType<typeof serverEventTypes.playerLeft> {
    return ServerEventSchema.parse({
      type: serverEventTypes.playerLeft,
      room,
    }) as ServerEventByType<typeof serverEventTypes.playerLeft>;
  },
  gameStarted(room: RoomState): ServerEventByType<typeof serverEventTypes.gameStarted> {
    return ServerEventSchema.parse({
      type: serverEventTypes.gameStarted,
      room,
    }) as ServerEventByType<typeof serverEventTypes.gameStarted>;
  },
  actionApplied(room: RoomState): ServerEventByType<typeof serverEventTypes.actionApplied> {
    return ServerEventSchema.parse({
      type: serverEventTypes.actionApplied,
      room,
    }) as ServerEventByType<typeof serverEventTypes.actionApplied>;
  },
  error(code: ServerErrorCode, message: string): ServerEventByType<typeof serverEventTypes.error> {
    return ServerEventSchema.parse({
      type: serverEventTypes.error,
      code,
      message,
    }) as ServerEventByType<typeof serverEventTypes.error>;
  },
};

export function getRoomWebSocketPath(roomId: string) {
  return `${roomPartyPathPrefix}/${encodeURIComponent(roomId)}`;
}

export type Suit = z.infer<typeof SuitSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Play = z.infer<typeof PlaySchema>;
export type GameRuleSettings = z.infer<typeof GameRuleSettingsSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type RoomParticipant = z.infer<typeof RoomParticipantSchema>;
export type RoomState = z.infer<typeof RoomStateSchema>;
export type CreateRoomResponse = z.infer<typeof CreateRoomResponseSchema>;
export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>;
export type ClientEvent = z.infer<typeof ClientEventSchema>;
export type ServerErrorCode = z.infer<typeof ServerErrorCodeSchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
