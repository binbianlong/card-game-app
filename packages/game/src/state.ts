import { analyzePlay, canPlayOn } from "./rules.ts";
import { DEFAULT_GAME_RULES } from "./local-rules/defaults.ts";
import { isEightCutEnabled } from "./local-rules/eight-cut.ts";
import { getNextElevenBack } from "./local-rules/eleven-back.ts";
import { getNextRevolution } from "./local-rules/revolution.ts";
import { assertSequenceAllowed } from "./local-rules/sequence.ts";
import { getNextSuitLock, matchesSuitLock } from "./local-rules/suit-lock.ts";
import {
  GameRuleError,
  type Card,
  type GameAction,
  type GameRuleSettings,
  type GameState,
  type PlayerId,
  type PlayerState,
} from "./types.ts";

export type CreateGameStateOptions = {
  rules?: Partial<GameRuleSettings>;
};

export function createGameState(
  players: readonly {
    id: PlayerId;
    hand: readonly Card[];
    connected?: boolean;
  }[],
  firstPlayerId: PlayerId = players[0]?.id ?? "",
  options: CreateGameStateOptions = {},
): GameState {
  if (players.length < 3 || players.length > 6) {
    throw new GameRuleError("Game requires between 3 and 6 players.");
  }

  if (new Set(players.map((player) => player.id)).size !== players.length) {
    throw new GameRuleError("Player ids must be unique.");
  }

  if (players.some((player) => player.hand.length === 0)) {
    throw new GameRuleError("Each player must have at least one card.");
  }

  const cardIds = players.flatMap((player) => player.hand.map((card) => card.id));

  if (new Set(cardIds).size !== cardIds.length) {
    throw new GameRuleError("Card ids must be unique across players.");
  }

  if (!players.some((player) => player.id === firstPlayerId)) {
    throw new GameRuleError("First player must exist in players.");
  }

  return {
    phase: "playing",
    rules: {
      ...DEFAULT_GAME_RULES,
      ...options.rules,
    },
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
    elevenBack: false,
    revolution: false,
    suitLock: null,
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

  assertSequenceAllowed(play, state.rules);

  if (!canPlayOn(cards, state.table.play, { revolution: getEffectiveRevolution(state) })) {
    throw new GameRuleError("Cards cannot be played on the current table.");
  }

  if (!matchesSuitLock(play, state.suitLock)) {
    throw new GameRuleError("Cards do not match the current suit lock.");
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
  const eightCut = isEightCutEnabled(play, state.rules);
  const elevenBack = eightCut ? false : state.elevenBack || getNextElevenBack(play, state.rules);
  const revolution = getNextRevolution(state.revolution, play, state.rules);
  const nextBase: GameState = {
    ...state,
    players: nextPlayers,
    table: eightCut
      ? {
          play: null,
          playedBy: null,
        }
      : {
          play,
          playedBy: playerId,
        },
    passedPlayerIds: [],
    elevenBack,
    revolution,
    suitLock:
      eightCut || !state.rules.suitLock
        ? null
        : getNextSuitLock(state.table.play, play, state.suitLock),
    rankings,
  };

  return completeIfNeeded({
    ...nextBase,
    turnPlayerId:
      eightCut && updatedHand.length > 0 ? playerId : getNextActivePlayerId(nextBase, playerId),
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
      elevenBack: false,
      suitLock: null,
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
    elevenBack: false,
    suitLock: null,
  };
}

function getEffectiveRevolution(state: GameState): boolean {
  return state.revolution !== state.elevenBack;
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}
