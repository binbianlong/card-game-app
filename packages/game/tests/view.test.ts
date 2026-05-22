import { describe, expect, test } from "vite-plus/test";
import { applyGameAction, createGameState, GameRuleError, getPlayerView } from "../src/index.ts";
import { card } from "./helpers.ts";

describe("player view", () => {
  test("shows the viewer hand and hides other players' hands", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3"), card("9")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    const view = getPlayerView(state, "p1");

    expect(view.viewerId).toBe("p1");
    expect(view.players).toEqual([
      {
        id: "p1",
        connected: true,
        handCount: 2,
        hand: [card("3"), card("9")],
        finished: false,
        rank: null,
      },
      {
        id: "p2",
        connected: true,
        handCount: 1,
        hand: null,
        finished: false,
        rank: null,
      },
      {
        id: "p3",
        connected: true,
        handCount: 1,
        hand: null,
        finished: false,
        rank: null,
      },
    ]);
  });

  test("includes rank metadata for finished players", () => {
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

    const view = getPlayerView(p1Finished, "p2");

    expect(view.players.find((player) => player.id === "p1")).toMatchObject({
      handCount: 0,
      hand: null,
      finished: true,
      rank: 1,
    });
  });

  test("rejects unknown viewers", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    expect(() => getPlayerView(state, "missing")).toThrow(GameRuleError);
  });
});
