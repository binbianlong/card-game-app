import { z } from "zod";

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
  status: z.enum(["waiting", "playing", "finished"]),
  hostPlayerId: z.string().min(1),
  participants: z.array(RoomParticipantSchema),
  rules: GameRuleSettingsSchema,
  game: GameStateSchema.nullable(),
});

const RoomPlayerEventBaseSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});

export const ClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createRoom"),
    playerName: z.string().min(1),
    playerCount: z.number().int().min(3).max(6),
    cpuCount: z.number().int().min(0).max(5),
    rules: GameRuleSettingsSchema,
  }),
  z.object({
    type: z.literal("joinRoom"),
    roomId: z.string().min(1),
    playerName: z.string().min(1),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal("leaveRoom"),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal("setReady"),
    ready: z.boolean(),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal("updateRules"),
    rules: GameRuleSettingsSchema,
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal("startGame"),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal("playCards"),
    cardIds: z.array(z.string().min(1)).min(1),
  }),
  RoomPlayerEventBaseSchema.extend({
    type: z.literal("pass"),
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
    type: z.literal("roomState"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("playerJoined"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("playerLeft"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("gameStarted"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("actionApplied"),
    room: RoomStateSchema,
  }),
  z.object({
    type: z.literal("error"),
    code: ServerErrorCodeSchema,
    message: z.string().min(1),
  }),
]);

export type Suit = z.infer<typeof SuitSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Play = z.infer<typeof PlaySchema>;
export type GameRuleSettings = z.infer<typeof GameRuleSettingsSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type RoomParticipant = z.infer<typeof RoomParticipantSchema>;
export type RoomState = z.infer<typeof RoomStateSchema>;
export type ClientEvent = z.infer<typeof ClientEventSchema>;
export type ServerErrorCode = z.infer<typeof ServerErrorCodeSchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
