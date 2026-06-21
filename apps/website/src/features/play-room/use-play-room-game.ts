import {
  getAvailableViewActions,
  getPlayableViewCardIds,
  getPlayableViewSelection,
  type Card,
  type Play,
  type PlayerGameView,
  type PlayerId,
} from "game";
import { useEffect, useMemo, useState } from "react";
import { useRoomSocket } from "@/features/room-socket/use-room-socket";
import { createClientEvent, type RoomClientState } from "schema";

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

type FinalResult = {
  cards: readonly Card[];
  kind: "cpu" | "guest" | "host";
  name: string;
  playerId: PlayerId;
  rank: number;
  remainingCards: readonly Card[];
};

const emptyPlayerView: PlayerGameView = {
  matchId: "",
  phase: "playing",
  rules: {
    eightCut: false,
    elevenBack: false,
    revolution: false,
    sequence: false,
    suitLock: false,
  },
  viewerId: "",
  players: [],
  turnPlayerId: "",
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

function usePlayRoomGame({
  connectionToken,
  playerId,
  roomId,
}: {
  connectionToken: string;
  cpuCount: number;
  playerCount: number;
  playerId: string;
  roomId: string;
}) {
  const { errorMessage, isReconnectRequired, room, sendEvent } = useRoomSocket({
    connectionToken,
    invalidMessage: "ゲーム状態を読み取れませんでした。",
    playerId,
    roomId,
  });
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const gameState = room?.game ?? null;
  const viewerId = playerId;
  const playerView = gameState ?? emptyPlayerView;
  const playerMetas = useMemo(() => createPlayerMetas(room), [room]);
  const viewer = playerView.players.find((player) => player.id === viewerId);
  const playerHand = viewer?.hand ?? [];
  const playerRank = viewer?.rank ?? null;
  const selectedCards = playerHand.filter((card) => selectedCardIds.includes(card.id));
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const playableCardIdSet = useMemo(
    () => new Set(gameState === null ? [] : getPlayableViewCardIds(gameState)),
    [gameState],
  );
  const availableActions =
    gameState === null
      ? { isTurn: false, canPlaySelectedCards: false, canPass: false }
      : getAvailableViewActions(gameState, { selectedCardIds });
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
    [playerMetas, playerView, viewerId],
  );
  const finalResults = useMemo(() => {
    if (gameState === null || gameState.phase !== "finished") {
      return [];
    }

    return gameState.rankings.map((rankedPlayerId, index): FinalResult => {
      const meta = getPlayerMeta(playerMetas, rankedPlayerId);
      const initialHand = gameState.initialHands?.find(
        (candidate) => candidate.playerId === rankedPlayerId,
      );
      const finalPlayer = gameState.players.find((candidate) => candidate.id === rankedPlayerId);

      return {
        cards: initialHand?.cards ?? [],
        kind: meta.kind,
        name: meta.name,
        playerId: rankedPlayerId,
        rank: index + 1,
        remainingCards: finalPlayer?.hand ?? [],
      };
    });
  }, [gameState, playerMetas]);
  const canStartRematch = room?.status === "finished" && room.hostPlayerId === playerId;

  useEffect(() => {
    setSelectedCardIds((currentIds) =>
      currentIds.filter((cardId) => playerHand.some((card) => card.id === cardId)),
    );
  }, [playerHand]);

  function toggleCard(cardId: string) {
    setSelectedCardIds((currentIds) => {
      if (currentIds.includes(cardId)) {
        return gameState?.table.play === null
          ? currentIds.filter((selectedId) => selectedId !== cardId)
          : [];
      }

      if (gameState?.table.play === null || gameState === null) {
        return [...currentIds, cardId];
      }

      return [...getPlayableViewSelection(gameState, cardId)];
    });
  }

  function clearSelection() {
    setSelectedCardIds([]);
  }

  function playSelectedCards() {
    sendEvent(
      createClientEvent.playCards({
        roomId,
        playerId,
        cardIds: selectedCardIds,
      }),
    );
    setSelectedCardIds([]);
  }

  function passTurn() {
    sendEvent(createClientEvent.pass({ roomId, playerId }));
    setSelectedCardIds([]);
  }

  function startRematch() {
    sendEvent(createClientEvent.rematch({ roomId, playerId }));
    setSelectedCardIds([]);
  }

  function leaveRoom() {
    sendEvent(createClientEvent.leaveRoom({ roomId, playerId }));
  }

  return {
    availableActions,
    canStartRematch,
    clearSelection,
    errorMessage,
    finalResults,
    isReconnectRequired,
    leaveRoom,
    opponents,
    passTurn,
    playerHand,
    playableCardIdSet,
    playerMetas,
    playerRank,
    playerView,
    playSelectedCards,
    selectedCardIdSet,
    selectedCards,
    startRematch,
    toggleCard,
  };
}

function createPlayerMetas(room: RoomClientState | null): readonly PlayerMeta[] {
  return (
    room?.participants.map((participant) => ({
      id: participant.id,
      kind: participant.kind,
      name: participant.name,
    })) ?? []
  );
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
      return `${formatRank(play.rank)} 単体`;
    case "set":
      return `${formatRank(play.rank)} ${play.count}枚組`;
    case "sequence":
      return `${formatRank(play.lowRank)}-${formatRank(play.highRank)} 階段`;
  }
}

function formatRank(rank: string) {
  return rank;
}

function formatRankings(rankings: readonly PlayerId[], playerMetas: readonly PlayerMeta[]) {
  if (rankings.length === 0) {
    return "順位はまだ確定していません。";
  }

  return rankings
    .map((playerId, index) => `${index + 1}位 ${getPlayerMeta(playerMetas, playerId).name}`)
    .join(" / ");
}

export {
  describePlay,
  formatRankings,
  getPlayerMeta,
  usePlayRoomGame,
  type FinalResult,
  type Opponent,
  type PlayerMeta,
};
export type { Play };
