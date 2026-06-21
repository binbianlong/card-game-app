import { describe, expect, test } from "vite-plus/test";
import {
  applyGameAction,
  canPass,
  canPlaySelectedCards,
  createGameState,
  getAvailableActions,
  getPlayableViewCardIds,
  getPlayableViewSelection,
  getPlayerView,
} from "../src/index.ts";
import { card } from "./helpers.ts";

describe("available actions", () => {
  test("allows the turn player to play a valid selected card", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3"), card("9")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    expect(canPlaySelectedCards(state, "p1", ["spades-3"])).toBe(true);
    expect(canPlaySelectedCards(state, "p1", [])).toBe(false);
    expect(canPlaySelectedCards(state, "p2", ["spades-4"])).toBe(false);
  });

  test("reuses table validation for selected cards", () => {
    const state = createGameState([
      { id: "p1", hand: [card("7")] },
      { id: "p2", hand: [card("6"), card("8")] },
      { id: "p3", hand: [card("9")] },
    ]);
    const played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-7"],
    });

    expect(canPlaySelectedCards(played, "p2", ["spades-6"])).toBe(false);
    expect(canPlaySelectedCards(played, "p2", ["spades-8"])).toBe(true);
  });

  test("allows pass only when the current table can be passed", () => {
    const state = createGameState([
      { id: "p1", hand: [card("7")] },
      { id: "p2", hand: [card("8")] },
      { id: "p3", hand: [card("9")] },
    ]);
    const played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["spades-7"],
    });

    expect(canPass(state, "p1")).toBe(false);
    expect(canPass(played, "p2")).toBe(true);
    expect(canPass(played, "p3")).toBe(false);
  });

  test("summarizes current action availability", () => {
    const state = createGameState([
      { id: "p1", hand: [card("3")] },
      { id: "p2", hand: [card("4")] },
      { id: "p3", hand: [card("5")] },
    ]);

    expect(getAvailableActions(state, "p1", { selectedCardIds: ["spades-3"] })).toEqual({
      isTurn: true,
      canPlaySelectedCards: true,
      canPass: false,
    });
    expect(getAvailableActions(state, "p2", { selectedCardIds: ["spades-4"] })).toEqual({
      isTurn: false,
      canPlaySelectedCards: false,
      canPass: false,
    });
  });

  test("returns cards that belong to at least one legal play", () => {
    const state = createGameState([
      { id: "p1", hand: [card("7", "hearts"), card("7", "spades")] },
      {
        id: "p2",
        hand: [
          card("6", "hearts"),
          card("6", "spades"),
          card("8", "hearts"),
          card("8", "spades"),
          card("9", "clubs"),
        ],
      },
      { id: "p3", hand: [card("10")] },
    ]);
    const played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["hearts-7", "spades-7"],
    });

    expect(getPlayableViewCardIds(getPlayerView(played, "p2"))).toEqual(["hearts-8", "spades-8"]);
    expect(getPlayableViewCardIds(getPlayerView(played, "p3"))).toEqual([]);
  });

  test("returns a complete legal selection for a clicked card", () => {
    const state = createGameState([
      { id: "p1", hand: [card("7", "hearts"), card("7", "spades")] },
      {
        id: "p2",
        hand: [
          card("6", "hearts"),
          card("6", "spades"),
          card("8", "hearts"),
          card("8", "spades"),
          card("9", "clubs"),
        ],
      },
      { id: "p3", hand: [card("10")] },
    ]);
    const played = applyGameAction(state, {
      type: "playCards",
      playerId: "p1",
      cardIds: ["hearts-7", "spades-7"],
    });
    const view = getPlayerView(played, "p2");

    expect(getPlayableViewSelection(view, "hearts-8")).toEqual(["hearts-8", "spades-8"]);
    expect(getPlayableViewSelection(view, "clubs-9")).toEqual([]);
  });
});
