import { createGameState, type CreateGameStateOptions } from "./state.ts";
import {
  GameRuleError,
  type Card,
  type GameState,
  type PlayerId,
  type Rank,
  type Suit,
} from "./types.ts";

const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const satisfies readonly Suit[];
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

export type JokerCount = 0 | 1 | 2;

export type CreateDeckOptions = {
  jokerCount?: JokerCount;
};

export type CreateNewGameOptions = CreateDeckOptions & {
  deck?: readonly Card[];
  rng?: () => number;
  rules?: CreateGameStateOptions["rules"];
};

export function createDeck(options: CreateDeckOptions = {}): readonly Card[] {
  const jokerCount = options.jokerCount ?? 1;
  assertJokerCount(jokerCount);

  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${suit}-${rank}`,
        rank,
        suit,
      });
    }
  }

  for (let index = 1; index <= jokerCount; index += 1) {
    cards.push({
      id: `joker-${index}`,
      rank: "JOKER",
      suit: "joker",
    });
  }

  return cards;
}

export function shuffleCards(
  cards: readonly Card[],
  rng: () => number = Math.random,
): readonly Card[] {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function dealCards(
  playerIds: readonly PlayerId[],
  deck: readonly Card[],
): readonly {
  id: PlayerId;
  hand: readonly Card[];
}[] {
  assertPlayerIds(playerIds);

  const hands = new Map<PlayerId, Card[]>(playerIds.map((playerId) => [playerId, []]));

  deck.forEach((card, index) => {
    hands.get(playerIds[index % playerIds.length])?.push(card);
  });

  return playerIds.map((playerId) => ({
    id: playerId,
    hand: hands.get(playerId) ?? [],
  }));
}

export function createNewGame(
  playerIds: readonly PlayerId[],
  options: CreateNewGameOptions = {},
): GameState {
  assertPlayerIds(playerIds);
  if (options.jokerCount !== undefined) {
    assertJokerCount(options.jokerCount);
  }

  const deck = options.deck ?? createDeck({ jokerCount: options.jokerCount });
  const shuffled = shuffleCards(deck, options.rng);
  const players = dealCards(playerIds, shuffled);
  const firstPlayerId = findCardOwner(players, "diamonds-3") ?? playerIds[0];

  return createGameState(players, firstPlayerId, { rules: options.rules });
}

function findCardOwner(
  players: readonly {
    id: PlayerId;
    hand: readonly Card[];
  }[],
  cardId: string,
): PlayerId | undefined {
  return players.find((player) => player.hand.some((card) => card.id === cardId))?.id;
}

function assertPlayerIds(playerIds: readonly PlayerId[]): void {
  if (playerIds.length < 3 || playerIds.length > 6) {
    throw new GameRuleError("Game requires between 3 and 6 players.");
  }

  if (new Set(playerIds).size !== playerIds.length) {
    throw new GameRuleError("Player ids must be unique.");
  }
}

function assertJokerCount(jokerCount: number): asserts jokerCount is JokerCount {
  if (!Number.isInteger(jokerCount) || jokerCount < 0 || jokerCount > 2) {
    throw new GameRuleError("Joker count must be between 0 and 2.");
  }
}
