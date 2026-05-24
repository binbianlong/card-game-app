import { describe, expect, test } from "vite-plus/test";
import {
  ClientEventSchema,
  RoomStateSchema,
  ServerEventSchema,
  type RoomState,
} from "../src/index.ts";

const rules = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  sequence: true,
  suitLock: true,
};

const room: RoomState = {
  id: "room-1",
  inviteCode: "8QJ4",
  status: "waiting",
  hostPlayerId: "player-1",
  participants: [
    {
      id: "player-1",
      name: "Host",
      kind: "host",
      connected: true,
      ready: true,
    },
  ],
  rules,
  game: null,
};

describe("schema", () => {
  test("parses client events", () => {
    expect(
      ClientEventSchema.parse({
        type: "playCards",
        roomId: "room-1",
        playerId: "player-1",
        cardIds: ["spades-3"],
      }),
    ).toEqual({
      type: "playCards",
      roomId: "room-1",
      playerId: "player-1",
      cardIds: ["spades-3"],
    });
  });

  test("rejects malformed client events", () => {
    expect(() =>
      ClientEventSchema.parse({
        type: "playCards",
        roomId: "room-1",
        playerId: "player-1",
        cardIds: [],
      }),
    ).toThrow();
  });

  test("parses room state", () => {
    expect(RoomStateSchema.parse(room)).toEqual(room);
  });

  test("parses server events", () => {
    expect(
      ServerEventSchema.parse({
        type: "roomState",
        room,
      }),
    ).toEqual({
      type: "roomState",
      room,
    });
  });
});
