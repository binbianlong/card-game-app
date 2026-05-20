export type Suit = "clubs" | "diamonds" | "hearts" | "spades";

export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";

export type Card =
  | {
      id: string;
      rank: Rank;
      suit: Suit;
    }
  | {
      id: string;
      rank: "JOKER";
      suit: "joker";
    };

export type PlayKind = "single" | "set" | "sequence";

export type Play =
  | {
      kind: "single";
      cards: readonly Card[];
      rank: Rank | "JOKER";
      isEightCut: boolean;
      causesRevolution: boolean;
    }
  | {
      kind: "set";
      cards: readonly Card[];
      rank: Rank;
      count: number;
      isEightCut: boolean;
      causesRevolution: boolean;
    }
  | {
      kind: "sequence";
      cards: readonly Card[];
      suit: Suit;
      lowRank: Rank;
      highRank: Rank;
      count: number;
      isEightCut: boolean;
      causesRevolution: boolean;
    };

export type RuleOptions = {
  revolution?: boolean;
};

export type PlayerId = string;

export type PlayerState = {
  id: PlayerId;
  hand: readonly Card[];
  connected: boolean;
};

export type GamePhase = "playing" | "finished";

export type GameState = {
  phase: GamePhase;
  players: readonly PlayerState[];
  turnPlayerId: PlayerId;
  table: {
    play: Play | null;
    playedBy: PlayerId | null;
  };
  passedPlayerIds: readonly PlayerId[];
  revolution: boolean;
  rankings: readonly PlayerId[];
};

export type GameAction =
  | {
      type: "playCards";
      playerId: PlayerId;
      cardIds: readonly string[];
    }
  | {
      type: "pass";
      playerId: PlayerId;
    }
  | {
      type: "disconnect";
      playerId: PlayerId;
    }
  | {
      type: "reconnect";
      playerId: PlayerId;
    };

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

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

export function createGameState(
  players: readonly {
    id: PlayerId;
    hand: readonly Card[];
    connected?: boolean;
  }[],
  firstPlayerId: PlayerId = players[0]?.id ?? "",
): GameState {
  if (players.length < 2) {
    throw new GameRuleError("At least two players are required.");
  }

  if (!players.some((player) => player.id === firstPlayerId)) {
    throw new GameRuleError("First player must exist in players.");
  }

  return {
    phase: "playing",
    players: players.map((player) => ({
      id: player.id,
      hand: [...player.hand],
      connected: player.connected ?? true,
    })),
    turnPlayerId: firstPlayerId,
    table: {
      play: null,
      playedBy: null,
    },
    passedPlayerIds: [],
    revolution: false,
    rankings: [],
  };
}

export function applyGameAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "playCards":
      return applyPlayCards(state, action.playerId, action.cardIds);
    case "pass":
      return applyPass(state, action.playerId);
    case "disconnect":
      return setPlayerConnection(state, action.playerId, false);
    case "reconnect":
      return setPlayerConnection(state, action.playerId, true);
  }
}

function applyPlayCards(
  state: GameState,
  playerId: PlayerId,
  cardIds: readonly string[],
): GameState {
  assertPlayingTurn(state, playerId);

  const player = getPlayer(state, playerId);
  const cards = takeCards(player.hand, cardIds);
  const play = analyzePlay(cards);

  if (play === null) {
    throw new GameRuleError("Cards do not form a valid play.");
  }

  if (!canPlayOn(cards, state.table.play, { revolution: state.revolution })) {
    throw new GameRuleError("Cards cannot be played on the current table.");
  }

  const updatedHand = player.hand.filter((card) => !cardIds.includes(card.id));
  const nextPlayers = state.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          hand: updatedHand,
        }
      : candidate,
  );
  const rankings = updatedHand.length === 0 ? [...state.rankings, playerId] : [...state.rankings];
  const revolution = play.causesRevolution ? !state.revolution : state.revolution;
  const nextBase: GameState = {
    ...state,
    players: nextPlayers,
    table: play.isEightCut
      ? {
          play: null,
          playedBy: null,
        }
      : {
          play,
          playedBy: playerId,
        },
    passedPlayerIds: [],
    revolution,
    rankings,
  };

  return completeIfNeeded({
    ...nextBase,
    turnPlayerId:
      play.isEightCut && updatedHand.length > 0
        ? playerId
        : getNextActivePlayerId(nextBase, playerId),
  });
}

function applyPass(state: GameState, playerId: PlayerId): GameState {
  assertPlayingTurn(state, playerId);

  if (state.table.play === null || state.table.playedBy === null) {
    throw new GameRuleError("Cannot pass when the table is empty.");
  }

  const passedPlayerIds = unique([...state.passedPlayerIds, playerId]);
  const activePlayerIds = getActivePlayerIds(state);
  const waitingPlayerIds = activePlayerIds.filter(
    (activePlayerId) => activePlayerId !== state.table.playedBy,
  );
  const shouldClearTable = waitingPlayerIds.every((activePlayerId) =>
    passedPlayerIds.includes(activePlayerId),
  );

  if (shouldClearTable) {
    const clearedState: GameState = {
      ...state,
      table: {
        play: null,
        playedBy: null,
      },
      passedPlayerIds: [],
    };

    return {
      ...clearedState,
      turnPlayerId: getLeadPlayerIdAfterTableClear(clearedState, state.table.playedBy),
    };
  }

  return {
    ...state,
    passedPlayerIds,
    turnPlayerId: getNextActivePlayerId(state, playerId),
  };
}

function setPlayerConnection(state: GameState, playerId: PlayerId, connected: boolean): GameState {
  getPlayer(state, playerId);

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            connected,
          }
        : player,
    ),
  };
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

function assertPlayingTurn(state: GameState, playerId: PlayerId): void {
  if (state.phase !== "playing") {
    throw new GameRuleError("Game is not playing.");
  }

  if (state.turnPlayerId !== playerId) {
    throw new GameRuleError("It is not this player's turn.");
  }

  const player = getPlayer(state, playerId);

  if (player.hand.length === 0) {
    throw new GameRuleError("Player has already finished.");
  }
}

function getPlayer(state: GameState, playerId: PlayerId): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);

  if (player === undefined) {
    throw new GameRuleError("Player does not exist.");
  }

  return player;
}

function takeCards(hand: readonly Card[], cardIds: readonly string[]): readonly Card[] {
  if (cardIds.length === 0) {
    throw new GameRuleError("At least one card is required.");
  }

  if (new Set(cardIds).size !== cardIds.length) {
    throw new GameRuleError("Card ids must be unique.");
  }

  return cardIds.map((cardId) => {
    const card = hand.find((candidate) => candidate.id === cardId);

    if (card === undefined) {
      throw new GameRuleError("Player does not have the requested card.");
    }

    return card;
  });
}

function getNextActivePlayerId(state: GameState, fromPlayerId: PlayerId): PlayerId {
  const activePlayerIds = getActivePlayerIds(state);

  if (activePlayerIds.length === 0) {
    return fromPlayerId;
  }

  const startIndex = state.players.findIndex((player) => player.id === fromPlayerId);

  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player =
      state.players[(startIndex + offset + state.players.length) % state.players.length];

    if (activePlayerIds.includes(player.id)) {
      return player.id;
    }
  }

  return activePlayerIds[0];
}

function getLeadPlayerIdAfterTableClear(state: GameState, playedBy: PlayerId): PlayerId {
  const activePlayerIds = getActivePlayerIds(state);

  if (activePlayerIds.includes(playedBy)) {
    return playedBy;
  }

  return getNextActivePlayerId(state, playedBy);
}

function getActivePlayerIds(state: GameState): readonly PlayerId[] {
  return state.players
    .filter((player) => player.hand.length > 0 && !state.rankings.includes(player.id))
    .map((player) => player.id);
}

function completeIfNeeded(state: GameState): GameState {
  const activePlayerIds = getActivePlayerIds(state);

  if (activePlayerIds.length > 1) {
    return state;
  }

  return {
    ...state,
    phase: "finished",
    rankings: unique([...state.rankings, ...activePlayerIds]),
    passedPlayerIds: [],
    table: {
      play: null,
      playedBy: null,
    },
  };
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}
