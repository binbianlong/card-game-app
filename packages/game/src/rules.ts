import type { Card, Play, Rank, RuleOptions } from "./types.ts";

const RANKS = [
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
] as const satisfies readonly Rank[];

const SEQUENCE_RANKS = RANKS.filter((rank) => rank !== "2");
const rankStrength = new Map<Rank, number>(RANKS.map((rank, index) => [rank, index]));

export function compareRanks(
  left: Rank | "JOKER",
  right: Rank | "JOKER",
  options: RuleOptions = {},
): number {
  if (left === right) {
    return 0;
  }

  if (left === "JOKER") {
    return 1;
  }

  if (right === "JOKER") {
    return -1;
  }

  const diff = getRankStrength(left) - getRankStrength(right);
  return options.revolution === true ? -diff : diff;
}

export function analyzePlay(cards: readonly Card[]): Play | null {
  if (cards.length === 0) {
    return null;
  }

  const sorted = sortCards(cards);

  if (sorted.length === 1) {
    const [card] = sorted;
    return {
      kind: "single",
      cards: sorted,
      rank: card.rank,
      isEightCut: card.rank === "8",
      causesRevolution: false,
    };
  }

  return analyzeSet(sorted) ?? analyzeSequence(sorted);
}

export function canPlayOn(
  nextCards: readonly Card[],
  previousPlay: Play | null,
  options: RuleOptions = {},
): boolean {
  const nextPlay = analyzePlay(nextCards);

  if (nextPlay === null) {
    return false;
  }

  if (previousPlay === null) {
    return true;
  }

  if (nextPlay.kind !== previousPlay.kind) {
    return false;
  }

  if (nextPlay.cards.length !== previousPlay.cards.length) {
    return false;
  }

  if (nextPlay.kind === "sequence" && previousPlay.kind === "sequence") {
    return compareRanks(nextPlay.highRank, previousPlay.highRank, options) > 0;
  }

  if (
    (nextPlay.kind === "single" || nextPlay.kind === "set") &&
    (previousPlay.kind === "single" || previousPlay.kind === "set")
  ) {
    return compareRanks(nextPlay.rank, previousPlay.rank, options) > 0;
  }

  return false;
}

function analyzeSet(cards: readonly Card[]): Play | null {
  const jokers = cards.filter((card) => card.rank === "JOKER");
  const naturalCards = cards.filter((card) => card.rank !== "JOKER");

  if (naturalCards.length === 0) {
    return null;
  }

  const [first] = naturalCards;
  const isSameRank = naturalCards.every((card) => card.rank === first.rank);

  if (!isSameRank) {
    return null;
  }

  return {
    kind: "set",
    cards,
    rank: first.rank,
    count: cards.length,
    isEightCut: first.rank === "8",
    causesRevolution: cards.length >= 4 || jokers.length + naturalCards.length >= 4,
  };
}

function analyzeSequence(cards: readonly Card[]): Play | null {
  if (cards.length < 3) {
    return null;
  }

  const jokerCount = cards.filter((card) => card.rank === "JOKER").length;
  const naturalCards = cards.filter((card) => card.rank !== "JOKER");

  if (naturalCards.length === 0) {
    return null;
  }

  const [first] = naturalCards;
  const isSameSuit = naturalCards.every((card) => card.suit === first.suit);

  if (!isSameSuit) {
    return null;
  }

  const naturalIndexes = naturalCards.map((card) => getSequenceRankIndex(card.rank));

  if (naturalIndexes.includes(-1)) {
    return null;
  }

  const uniqueIndexes = new Set(naturalIndexes);

  if (uniqueIndexes.size !== naturalIndexes.length) {
    return null;
  }

  const min = Math.min(...naturalIndexes);
  const max = Math.max(...naturalIndexes);
  const missingCount = max - min + 1 - naturalCards.length;

  if (missingCount > jokerCount) {
    return null;
  }

  const remainingJokers = jokerCount - missingCount;
  const lowIndex = Math.max(0, min - remainingJokers);
  const highIndex = lowIndex + cards.length - 1;

  if (highIndex >= SEQUENCE_RANKS.length) {
    return null;
  }

  const lowRank = SEQUENCE_RANKS[lowIndex];
  const highRank = SEQUENCE_RANKS[highIndex];

  return {
    kind: "sequence",
    cards,
    suit: first.suit,
    lowRank,
    highRank,
    count: cards.length,
    isEightCut: sequenceContainsRank(lowRank, highRank, "8"),
    causesRevolution: cards.length >= 5,
  };
}

function sortCards(cards: readonly Card[]): readonly Card[] {
  return [...cards].sort((left, right) => {
    if (left.rank === "JOKER") {
      return 1;
    }

    if (right.rank === "JOKER") {
      return -1;
    }

    return getRankStrength(left.rank) - getRankStrength(right.rank);
  });
}

function sequenceContainsRank(lowRank: Rank, highRank: Rank, target: Rank) {
  const low = getSequenceRankIndex(lowRank);
  const high = getSequenceRankIndex(highRank);
  const value = getSequenceRankIndex(target);

  return low <= value && value <= high;
}

function getRankStrength(rank: Rank): number {
  const strength = rankStrength.get(rank);

  if (strength === undefined) {
    throw new Error(`Unknown rank: ${rank}`);
  }

  return strength;
}

function getSequenceRankIndex(rank: Rank): number {
  if (rank === "2") {
    return -1;
  }

  return SEQUENCE_RANKS.indexOf(rank);
}
