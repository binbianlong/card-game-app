import { describe, expect, test } from "vite-plus/test";
import {
  analyzePlay,
  applyGameAction,
  canPlayOn,
  compareRanks,
  createGameState,
  GameRuleError,
  type Card,
  type Rank,
  type Suit,
} from "../src/index.ts";

const card = (rank: Rank, suit: Suit = "spades"): Card => ({
  id: `${suit}-${rank}`,
  rank,
  suit,
});

const joker = (): Card => ({
  id: "joker-1",
  rank: "JOKER",
  suit: "joker",
});

describe("compareRanks", () => {
  test("orders ranks by daifugo strength", () => {
    expect(compareRanks("4", "3")).toBeGreaterThan(0);
    expect(compareRanks("2", "A")).toBeGreaterThan(0);
    expect(compareRanks("JOKER", "2")).toBeGreaterThan(0);
  });

  test("reverses natural rank order during revolution", () => {
    expect(compareRanks("3", "4", { revolution: true })).toBeGreaterThan(0);
    expect(compareRanks("JOKER", "3", { revolution: true })).toBeGreaterThan(0);
  });
});

describe("analyzePlay", () => {
  test("detects a single card", () => {
    expect(analyzePlay([card("8")])).toMatchObject({
      kind: "single",
      rank: "8",
      isEightCut: true,
      causesRevolution: false,
    });
  });

  test("detects a set with a joker", () => {
    expect(analyzePlay([card("Q"), card("Q", "hearts"), joker()])).toMatchObject({
      kind: "set",
      rank: "Q",
      count: 3,
      causesRevolution: false,
    });
  });

  test("detects four of a kind as revolution", () => {
    expect(
      analyzePlay([
        card("5", "clubs"),
        card("5", "diamonds"),
        card("5", "hearts"),
        card("5", "spades"),
      ]),
    ).toMatchObject({
      kind: "set",
      rank: "5",
      count: 4,
      causesRevolution: true,
    });
  });

  test("detects same-suit sequence", () => {
    expect(
      analyzePlay([card("6", "hearts"), card("7", "hearts"), card("8", "hearts")]),
    ).toMatchObject({
      kind: "sequence",
      suit: "hearts",
      lowRank: "6",
      highRank: "8",
      isEightCut: true,
    });
  });

  test("detects sequence with a joker filling a gap", () => {
    expect(analyzePlay([card("6", "clubs"), joker(), card("8", "clubs")])).toMatchObject({
      kind: "sequence",
      suit: "clubs",
      lowRank: "6",
      highRank: "8",
    });
  });

  test("rejects invalid mixed-rank plays", () => {
    expect(analyzePlay([card("6"), card("8")])).toBeNull();
    expect(analyzePlay([card("6", "clubs"), card("7", "hearts"), card("8", "clubs")])).toBeNull();
  });
});

describe("canPlayOn", () => {
  test("allows a stronger same-kind play", () => {
    const previous = analyzePlay([card("9")]);

    expect(canPlayOn([card("10")], previous)).toBe(true);
    expect(canPlayOn([card("8")], previous)).toBe(false);
  });

  test("requires same kind and same card count", () => {
    const previous = analyzePlay([card("9"), card("9", "hearts")]);

    expect(canPlayOn([card("10")], previous)).toBe(false);
    expect(canPlayOn([card("10"), card("10", "clubs")], previous)).toBe(true);
  });

  test("uses reversed ordering during revolution", () => {
    const previous = analyzePlay([card("9")]);

    expect(canPlayOn([card("8")], previous, { revolution: true })).toBe(true);
    expect(canPlayOn([card("10")], previous, { revolution: true })).toBe(false);
  });
});

describe("game state", () => {
  test("creates an initial playing state", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
    ]);

    expect(state).toMatchObject({
      phase: "playing",
      turnPlayerId: "p1",
      table: {
        play: null,
        playedBy: null,
      },
      revolution: false,
      rankings: [],
    });
  });

  test("plays cards, removes them from hand, and advances turn", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3"), card("5")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("6")] },
    ]);

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-3"],
    });

    expect(next.turnPlayerId).toBe("p2");
    expect(next.table.play).toMatchObject({ kind: "single", rank: "3" });
    expect(next.table.playedBy).toBe("p1");
    expect(next.players.find((player) => player.id === "p1")?.hand).toEqual([card("5")]);
  });

  test("rejects plays from the wrong turn", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
    ]);

    expect(() =>
      applyGameAction(state, {
        type: "playCards",
        playerId: "p2",
        cardIds: ["spades-4"],
      }),
    ).toThrow(GameRuleError);
  });

  test("rejects cards that are not in the player's hand", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
    ]);

    expect(() =>
      applyGameAction(state, {
        type: "playCards",
        playerId: "p1",
        cardIds: ["spades-9"],
      }),
    ).toThrow(GameRuleError);
  });

  test("passes turn and clears the table when every other active player passes", () => {
    const started = createGameState([
      { id: "p1", hand: [card("3"), card("7")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);
    const played = applyGameAction(started, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-3"],
    });
    const p2Passed = applyGameAction(played, {
      type: "pass",
      playerId: "p2",
    });
    const p3Passed = applyGameAction(p2Passed, {
      type: "pass",
      playerId: "p3",
    });

    expect(p3Passed.table.play).toBeNull();
    expect(p3Passed.table.playedBy).toBeNull();
    expect(p3Passed.passedPlayerIds).toEqual([]);
    expect(p3Passed.turnPlayerId).toBe("p1");
  });

  test("keeps turn on the same player after eight cut if they still have cards", () => {
    const state = createGameState([
      { id: "p1", hand: [card("8"), card("9")] },
      { id: "p2", hand: [card("4")] },
    ]);

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-8"],
    });

    expect(next.table.play).toBeNull();
    expect(next.turnPlayerId).toBe("p1");
  });

  test("toggles revolution after a revolution-causing play", () => {
    const state = createGameState([
      {
        id: "p1",
        hand: [card("5", "clubs"), card("5", "diamonds"), card("5", "hearts"), card("5", "spades")],
      },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("6")] },
    ]);

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["clubs-5", "diamonds-5", "hearts-5", "spades-5"],
    });

    expect(next.revolution).toBe(true);
  });

  test("finishes the game when only one player remains active", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4"), card("5")] },
    ]);

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-3"],
    });

    expect(next.phase).toBe("finished");
    expect(next.rankings).toEqual(["p1", "p2"]);
    expect(next.table.play).toBeNull();
  });

  test("updates player connection state", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
    ]);

    const disconnected = applyGameAction(state, {
      type: "disconnect",
      playerId: "p2",
    });
    const reconnected = applyGameAction(disconnected, {
      type: "reconnect",
      playerId: "p2",
    });

    expect(disconnected.players.find((player) => player.id === "p2")?.connected).toBe(false);
    expect(reconnected.players.find((player) => player.id === "p2")?.connected).toBe(true);
  });
});
