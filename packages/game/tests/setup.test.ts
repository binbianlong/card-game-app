import { describe, expect, test } from "vite-plus/test";
import {
  createDeck,
  createNewGame,
  dealCards,
  GameRuleError,
  shuffleCards,
  type Card,
} from "../src/index.ts";
import { card } from "./helpers.ts";

describe("createDeck", () => {
  test("creates a default deck with one joker", () => {
    const deck = createDeck();

    expect(deck).toHaveLength(53);
    expect(deck).toContainEqual(card("3", "clubs"));
    expect(deck).toContainEqual(card("2", "spades"));
    expect(deck).toContainEqual({ id: "joker-1", rank: "JOKER", suit: "joker" });
    expect(uniqueCardIds(deck)).toHaveLength(deck.length);
  });

  test("supports zero or two jokers", () => {
    expect(createDeck({ jokerCount: 0 })).toHaveLength(52);

    const twoJokerDeck = createDeck({ jokerCount: 2 });

    expect(twoJokerDeck).toHaveLength(54);
    expect(twoJokerDeck).toContainEqual({ id: "joker-1", rank: "JOKER", suit: "joker" });
    expect(twoJokerDeck).toContainEqual({ id: "joker-2", rank: "JOKER", suit: "joker" });
    expect(uniqueCardIds(twoJokerDeck)).toHaveLength(twoJokerDeck.length);
  });

  test("rejects invalid joker counts", () => {
    expect(() => createDeck({ jokerCount: 3 as never })).toThrow(GameRuleError);
    expect(() => createDeck({ jokerCount: -1 as never })).toThrow(GameRuleError);
  });
});

describe("shuffleCards", () => {
  test("returns a shuffled copy without mutating the input", () => {
    const deck = [card("3"), card("4"), card("5"), card("6")];
    const shuffled = shuffleCards(deck, () => 0);

    expect(shuffled).toEqual([card("4"), card("5"), card("6"), card("3")]);
    expect(deck).toEqual([card("3"), card("4"), card("5"), card("6")]);
    expect(uniqueCardIds(shuffled)).toEqual(uniqueCardIds(deck));
  });
});

describe("dealCards", () => {
  test("deals cards evenly to three to six players", () => {
    for (const playerIds of [
      ["p1", "p2", "p3"],
      ["p1", "p2", "p3", "p4"],
      ["p1", "p2", "p3", "p4", "p5"],
      ["p1", "p2", "p3", "p4", "p5", "p6"],
    ]) {
      const players = dealCards(playerIds, createDeck({ jokerCount: 1 }));
      const handSizes = players.map((player) => player.hand.length);

      expect(Math.max(...handSizes) - Math.min(...handSizes)).toBeLessThanOrEqual(1);
      expect(uniqueCardIds(players.flatMap((player) => player.hand))).toHaveLength(53);
    }
  });
});

describe("createNewGame", () => {
  test("creates a game and gives first turn to the diamonds three owner", () => {
    const state = createNewGame(["p1", "p2", "p3"], {
      deck: [card("4", "clubs"), card("3", "diamonds"), card("5", "hearts"), card("6", "spades")],
      rng: () => 0.99,
    });

    expect(state.phase).toBe("playing");
    expect(state.turnPlayerId).toBe("p2");
    expect(uniqueCardIds(state.players.flatMap((player) => player.hand))).toHaveLength(4);
    expect(state.initialHands).toEqual(
      state.players.map((player) => ({
        playerId: player.id,
        cards: player.hand,
      })),
    );
  });

  test("falls back to the first player when diamonds three is absent", () => {
    const state = createNewGame(["p1", "p2", "p3"], {
      deck: [card("4", "clubs"), card("5", "diamonds"), card("6", "hearts")],
      rng: () => 0.99,
    });

    expect(state.turnPlayerId).toBe("p1");
  });

  test("applies local rule settings to the created game", () => {
    const state = createNewGame(["p1", "p2", "p3"], {
      deck: [card("4", "clubs"), card("5", "diamonds"), card("6", "hearts")],
      rng: () => 0.99,
      rules: { suitLock: true },
    });

    expect(state.rules.suitLock).toBe(true);
  });

  test("rejects unsupported player counts and duplicate player ids", () => {
    expect(() => createNewGame(["p1", "p2"])).toThrow(GameRuleError);
    expect(() => createNewGame(["p1", "p2", "p3", "p4", "p5", "p6", "p7"])).toThrow(GameRuleError);
    expect(() => createNewGame(["p1", "p2", "p1"])).toThrow(GameRuleError);
    expect(() => createNewGame(["p1", "p2", "p3"], { jokerCount: 3 as never })).toThrow(
      GameRuleError,
    );
  });
});

function uniqueCardIds(cards: readonly Card[]): readonly string[] {
  return [...new Set(cards.map((card) => card.id))].sort();
}
