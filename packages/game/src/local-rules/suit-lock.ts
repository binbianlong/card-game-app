import type { Card, Play, Suit } from "../types.ts";

export function matchesSuitLock(play: Play, suitLock: readonly Suit[] | null): boolean {
  if (suitLock === null) {
    return true;
  }

  const suitPattern = getSuitPattern(play);

  return sameSuitPattern(suitPattern, suitLock);
}

export function getNextSuitLock(
  previousPlay: Play | null,
  nextPlay: Play,
  currentSuitLock: readonly Suit[] | null,
): readonly Suit[] | null {
  if (currentSuitLock !== null) {
    return currentSuitLock;
  }

  if (previousPlay === null) {
    return null;
  }

  const previousPattern = getSuitPattern(previousPlay);
  const nextPattern = getSuitPattern(nextPlay);

  return sameSuitPattern(previousPattern, nextPattern) ? nextPattern : null;
}

function getSuitPattern(play: Play): readonly Suit[] {
  if (play.kind === "sequence") {
    return Array.from({ length: play.cards.length }, () => play.suit);
  }

  return play.cards
    .filter((card): card is Card & { suit: Suit } => card.suit !== "joker")
    .map((card) => card.suit)
    .sort();
}

function sameSuitPattern(left: readonly Suit[], right: readonly Suit[]): boolean {
  return (
    left.length > 0 &&
    left.length === right.length &&
    left.every((suit, index) => suit === right[index])
  );
}
