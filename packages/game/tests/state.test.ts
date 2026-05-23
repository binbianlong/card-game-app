import { describe, expect, test } from "vite-plus/test";
import { applyGameAction, createGameState, GameRuleError } from "../src/index.ts";
import { card } from "./helpers.ts";

describe("game state", () => {
  test("creates an initial playing state", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    expect(state).toMatchObject({
      phase: "playing",
      rules: {
        eightCut: true,
        revolution: true,
        sequence: true,
        suitLock: false,
      },
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
      { id: "p3", hand: [card("5")] },
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
      { id: "p3", hand: [card("5")] },
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

  test("finishes the game when only one player remains active", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5"), card("6")] },
    ]);

    const p1Finished = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-3"],
    });
    const next = applyGameAction(p1Finished, {
      type: "playCards",
      playerId: "p2",
      cardIds: ["spades-4"],
    });

    expect(next.phase).toBe("finished");
    expect(next.rankings).toEqual(["p1", "p2", "p3"]);
    expect(next.table.play).toBeNull();
  });

  test("ranks players as their hands empty and skips finished players", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4"), card("7")] },
      { id: "p3", hand: [card("5"), card("8")] },
    ]);

    const p1Finished = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-3"],
    });

    expect(p1Finished.rankings).toEqual(["p1"]);
    expect(p1Finished.turnPlayerId).toBe("p2");

    const p2Played = applyGameAction(p1Finished, {
      type: "playCards",
      playerId: "p2",
      cardIds: ["spades-4"],
    });

    expect(p2Played.turnPlayerId).toBe("p3");
    expect(() =>
      applyGameAction(p2Played, {
        type: "pass",
        playerId: "p1",
      }),
    ).toThrow(GameRuleError);
  });

  test("clears a table led by a finished player without returning turn to that player", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);
    const p1Finished = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-3"],
    });
    const p2Passed = applyGameAction(p1Finished, {
      type: "pass",
      playerId: "p2",
    });
    const p3Passed = applyGameAction(p2Passed, {
      type: "pass",
      playerId: "p3",
    });

    expect(p3Passed.table.play).toBeNull();
    expect(p3Passed.turnPlayerId).toBe("p2");
    expect(p3Passed.rankings).toEqual(["p1"]);
  });

  test("updates player connection state", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
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

  test("rejects games outside the supported player count", () => {
    expect(() =>
      createGameState([
        { id: "p1", hand: [card("3")] },
        { id: "p2", hand: [card("4")] },
      ]),
    ).toThrow(GameRuleError);
  });

  test("rejects duplicate player ids, empty hands, and duplicate card ids", () => {
    expect(() =>
      createGameState([
        { id: "p1", hand: [card("3")] },
        { id: "p1", hand: [card("4")] },
        { id: "p3", hand: [card("5")] },
      ]),
    ).toThrow(GameRuleError);

    expect(() =>
      createGameState([
        { id: "p1", hand: [card("3")] },
        { id: "p2", hand: [] },
        { id: "p3", hand: [card("5")] },
      ]),
    ).toThrow(GameRuleError);

    expect(() =>
      createGameState([
        { id: "p1", hand: [card("3")] },
        { id: "p2", hand: [card("3")] },
        { id: "p3", hand: [card("5")] },
      ]),
    ).toThrow(GameRuleError);
  });
});
