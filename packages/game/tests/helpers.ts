import type { Card, Rank, Suit } from "../src/index.ts";

export const card = (rank: Rank, suit: Suit = "spades"): Card => ({
  id: `${suit}-${rank}`,
  rank,
  suit,
});

export const joker = (): Card => ({
  id: "joker-1",
  rank: "JOKER",
  suit: "joker",
});
