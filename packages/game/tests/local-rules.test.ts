import { describe, expect, test } from "vite-plus/test";
import { applyGameAction, createGameState, GameRuleError } from "../src/index.ts";
import { card } from "./helpers.ts";

describe("local rules", () => {
  test("keeps turn on the same player after eight cut if they still have cards", () => {
    const state = createGameState(
      [
        { id: "p1", hand: [card("8"), card("9")] },
        { id: "p2", hand: [card("4")] },
        { id: "p3", hand: [card("5")] },
      ],
      "p1",
      { rules: { eightCut: true } },
    );

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-8"],
    });

    expect(next.table.play).toBeNull();
    expect(next.turnPlayerId).toBe("p1");
  });

  test("keeps eight as a normal play by default", () => {
    const state = createGameState([
      { id: "p1", hand: [card("8"), card("9")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-8"],
    });

    expect(next.table.play).toMatchObject({ kind: "single", rank: "8" });
    expect(next.turnPlayerId).toBe("p2");
  });

  test("toggles revolution after a revolution-causing play", () => {
    const state = createGameState(
      [
        {
          id: "p1",
          hand: [
            card("5", "clubs"),
            card("5", "diamonds"),
            card("5", "hearts"),
            card("5", "spades"),
          ],
        },
        { id: "p2", hand: [card("4")] },
        { id: "p3", hand: [card("6")] },
      ],
      "p1",
      { rules: { revolution: true } },
    );

    const next = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["clubs-5", "diamonds-5", "hearts-5", "spades-5"],
    });

    expect(next.revolution).toBe(true);
  });

  test("keeps revolution unchanged by default", () => {
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

    expect(next.revolution).toBe(false);
  });

  test("rejects sequences by default", () => {
    const state = createGameState([
      {
        id: "p1",
        hand: [card("6", "hearts"), card("7", "hearts"), card("8", "hearts")],
      },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    expect(() =>
      applyGameAction(state, {
        type: "playCards",
        playerId: "p1",
        cardIds: ["hearts-6", "hearts-7", "hearts-8"],
      }),
    ).toThrow(GameRuleError);
  });

  test("keeps suit lock disabled by default", () => {
    const state = createGameState([
      { id: "p1", hand: [card("5", "spades"), card("9", "clubs")] },
      { id: "p2", hand: [card("6", "spades"), card("10", "clubs")] },
      { id: "p3", hand: [card("7", "hearts")] },
    ]);
    const p1Played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-5"],
    });
    const p2Played = applyGameAction(p1Played, {
      type: "playCards",
      playerId: "p2",
      cardIds: ["spades-6"],
    });
    const p3Played = applyGameAction(p2Played, {
      type: "playCards",
      playerId: "p3",
      cardIds: ["hearts-7"],
    });

    expect(p3Played.suitLock).toBeNull();
  });

  test("locks suits as an enabled local rule", () => {
    const state = createGameState(
      [
        { id: "p1", hand: [card("5", "spades"), card("9", "clubs")] },
        { id: "p2", hand: [card("6", "spades"), card("10", "clubs")] },
        { id: "p3", hand: [card("7", "hearts"), card("7", "spades")] },
      ],
      "p1",
      { rules: { suitLock: true } },
    );
    const p1Played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-5"],
    });
    const p2Played = applyGameAction(p1Played, {
      type: "playCards",
      playerId: "p2",
      cardIds: ["spades-6"],
    });

    expect(p2Played.suitLock).toEqual(["spades"]);
    expect(() =>
      applyGameAction(p2Played, {
        type: "playCards",
        playerId: "p3",
        cardIds: ["hearts-7"],
      }),
    ).toThrow(GameRuleError);

    const p3Played = applyGameAction(p2Played, {
      type: "playCards",
      playerId: "p3",
      cardIds: ["spades-7"],
    });

    expect(p3Played.table.play).toMatchObject({ kind: "single", rank: "7" });
  });

  test("clears suit lock when the table is cleared", () => {
    const state = createGameState(
      [
        { id: "p1", hand: [card("5", "spades"), card("9", "hearts")] },
        { id: "p2", hand: [card("6", "spades")] },
        { id: "p3", hand: [card("7", "hearts")] },
      ],
      "p1",
      { rules: { suitLock: true } },
    );
    const p1Played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-5"],
    });
    const p2Played = applyGameAction(p1Played, {
      type: "playCards",
      playerId: "p2",
      cardIds: ["spades-6"],
    });
    const p3Passed = applyGameAction(p2Played, {
      type: "pass",
      playerId: "p3",
    });
    const p1Passed = applyGameAction(p3Passed, {
      type: "pass",
      playerId: "p1",
    });

    expect(p1Passed.table.play).toBeNull();
    expect(p1Passed.suitLock).toBeNull();
  });
});
