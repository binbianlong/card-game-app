import {
  applyGameAction,
  createNewGame,
  getAvailableActions,
  getPlayerView,
  type GameAction,
  type GameRuleSettings,
  type GameState,
  type Play,
  type PlayerId,
} from "game";
import { useEffect, useMemo, useState } from "react";
import { clientEventTypes } from "schema";

const viewerId = "player-1";

type PlayerMeta = {
  id: PlayerId;
  kind: "cpu" | "guest" | "host";
  name: string;
};

type Opponent = {
  cards: number;
  id: PlayerId;
  kind: "cpu" | "guest";
  name: string;
  rank: number | null;
  status: "finished" | "passed" | "thinking" | "waiting";
};

function usePlayRoomGame({
  cpuCount,
  playerCount,
  rules,
}: {
  cpuCount: number;
  playerCount: number;
  rules: GameRuleSettings;
}) {
  const playerMetas = useMemo(
    () => createPlayerMetas(playerCount, cpuCount),
    [cpuCount, playerCount],
  );
  const [gameState, setGameState] = useState(() => createInitialGameState(playerMetas, rules));
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const playerView = useMemo(() => getPlayerView(gameState, viewerId), [gameState]);
  const viewer = playerView.players.find((player) => player.id === viewerId);
  const playerHand = viewer?.hand ?? [];
  const playerRank = viewer?.rank ?? null;
  const selectedCards = playerHand.filter((card) => selectedCardIds.includes(card.id));
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const availableActions = getAvailableActions(gameState, viewerId, { selectedCardIds });
  const opponents = useMemo(
    () =>
      playerView.players
        .filter((player) => player.id !== viewerId)
        .map((player): Opponent => {
          const meta = getPlayerMeta(playerMetas, player.id);
          const isCurrentTurn =
            playerView.phase === "playing" && playerView.turnPlayerId === player.id;

          return {
            cards: player.handCount,
            id: player.id,
            kind: meta.kind === "cpu" ? "cpu" : "guest",
            name: meta.name,
            rank: player.rank,
            status: player.finished
              ? "finished"
              : isCurrentTurn
                ? "thinking"
                : playerView.passedPlayerIds.includes(player.id)
                  ? "passed"
                  : "waiting",
          };
        }),
    [playerMetas, playerView],
  );

  useEffect(() => {
    setGameState(createInitialGameState(playerMetas, rules));
    setSelectedCardIds([]);
  }, [playerMetas, rules]);

  useEffect(() => {
    setSelectedCardIds((currentIds) =>
      currentIds.filter((cardId) => playerHand.some((card) => card.id === cardId)),
    );
  }, [playerHand]);

  useEffect(() => {
    if (playerView.phase !== "playing" || playerView.turnPlayerId === viewerId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setGameState((currentState) => {
        if (currentState.phase !== "playing" || currentState.turnPlayerId === viewerId) {
          return currentState;
        }

        const action = createAutoAction(currentState, currentState.turnPlayerId);

        return action === null ? currentState : applyGameAction(currentState, action);
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [playerView]);

  function toggleCard(cardId: string) {
    setSelectedCardIds((currentIds) =>
      currentIds.includes(cardId)
        ? currentIds.filter((selectedId) => selectedId !== cardId)
        : [...currentIds, cardId],
    );
  }

  function clearSelection() {
    setSelectedCardIds([]);
  }

  function playSelectedCards() {
    setGameState((currentState) =>
      applyGameAction(currentState, {
        type: clientEventTypes.playCards,
        playerId: viewerId,
        cardIds: selectedCardIds,
      }),
    );
    setSelectedCardIds([]);
  }

  function passTurn() {
    setGameState((currentState) =>
      applyGameAction(currentState, {
        type: clientEventTypes.pass,
        playerId: viewerId,
      }),
    );
    setSelectedCardIds([]);
  }

  return {
    availableActions,
    clearSelection,
    opponents,
    passTurn,
    playerHand,
    playerMetas,
    playerRank,
    playerView,
    playSelectedCards,
    selectedCardIdSet,
    selectedCards,
    toggleCard,
  };
}

function createPlayerMetas(playerCount: number, cpuCount: number): readonly PlayerMeta[] {
  const humanCount = playerCount - cpuCount;

  return [
    { id: viewerId, kind: "host", name: "あなた" },
    ...Array.from(
      { length: humanCount - 1 },
      (_, index): PlayerMeta => ({
        id: `guest-${index + 1}`,
        kind: "guest",
        name: `参加者 ${index + 2}`,
      }),
    ),
    ...Array.from(
      { length: cpuCount },
      (_, index): PlayerMeta => ({
        id: `cpu-${index + 1}`,
        kind: "cpu",
        name: `CPU ${index + 1}`,
      }),
    ),
  ];
}

function createInitialGameState(
  playerMetas: readonly PlayerMeta[],
  rules: GameRuleSettings,
): GameState {
  return createNewGame(
    playerMetas.map((player) => player.id),
    { rng: createSeededRandom(playerMetas.map((player) => player.id).join("|")), rules },
  );
}

function createSeededRandom(seedText: string): () => number {
  let seed = 2166136261;

  for (const character of seedText) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createAutoAction(state: GameState, playerId: PlayerId): GameAction | null {
  const cardIds = findPlayableCardIds(state, playerId);

  if (cardIds !== null) {
    return {
      type: clientEventTypes.playCards,
      playerId,
      cardIds,
    };
  }

  if (getAvailableActions(state, playerId).canPass) {
    return {
      type: clientEventTypes.pass,
      playerId,
    };
  }

  return null;
}

function findPlayableCardIds(state: GameState, playerId: PlayerId): readonly string[] | null {
  const player = state.players.find((candidate) => candidate.id === playerId);

  if (player === undefined) {
    return null;
  }

  const cardCount = state.table.play?.cards.length ?? 1;

  for (const cardIds of createCardIdCombinations(
    player.hand.map((card) => card.id),
    cardCount,
  )) {
    if (getAvailableActions(state, playerId, { selectedCardIds: cardIds }).canPlaySelectedCards) {
      return cardIds;
    }
  }

  return null;
}

function createCardIdCombinations(
  cardIds: readonly string[],
  count: number,
): readonly (readonly string[])[] {
  if (count <= 0 || count > cardIds.length) {
    return [];
  }

  const combinations: string[][] = [];

  function collect(startIndex: number, currentCardIds: string[]) {
    if (currentCardIds.length === count) {
      combinations.push([...currentCardIds]);
      return;
    }

    for (let index = startIndex; index < cardIds.length; index += 1) {
      currentCardIds.push(cardIds[index]);
      collect(index + 1, currentCardIds);
      currentCardIds.pop();
    }
  }

  collect(0, []);

  return combinations;
}

function getPlayerMeta(playerMetas: readonly PlayerMeta[], playerId: PlayerId): PlayerMeta {
  return (
    playerMetas.find((player) => player.id === playerId) ?? {
      id: playerId,
      kind: "guest",
      name: playerId,
    }
  );
}

function describePlay(play: Play): string {
  switch (play.kind) {
    case "single":
      return play.rank === "JOKER" ? "ジョーカー" : `${play.rank}のシングル`;
    case "set":
      return `${play.rank}の${play.count}枚組`;
    case "sequence":
      return `${play.suit}の${play.lowRank}-${play.highRank}階段`;
  }
}

function formatRankings(rankings: readonly PlayerId[], playerMetas: readonly PlayerMeta[]): string {
  if (rankings.length === 0) {
    return "順位を集計しています。";
  }

  return rankings
    .map((playerId, index) => `${index + 1}位 ${getPlayerMeta(playerMetas, playerId).name}`)
    .join(" / ");
}

export { describePlay, formatRankings, getPlayerMeta, usePlayRoomGame };
export type { Opponent, PlayerMeta };
