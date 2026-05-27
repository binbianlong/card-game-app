import {
  getAvailableActions,
  getPlayerView,
  type Card,
  type Play,
  type PlayerGameView,
  type PlayerId,
} from "game";
import { useEffect, useMemo, useRef, useState } from "react";
import PartySocket from "partysocket";
import { getWorkerHost } from "@/features/rooms/room-api";
import { ServerEventSchema, createClientEvent, roomPartyName, type RoomState } from "schema";

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
};

const emptyPlayerView: PlayerGameView = {
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
  playerId,
  roomId,
}: {
  cpuCount: number;
  playerCount: number;
  playerId: string;
  roomId: string;
}) {
  const socketRef = useRef<PartySocket | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const gameState = room?.game ?? null;
  const viewerId = playerId;
  const playerView = useMemo(
    () => (gameState === null ? emptyPlayerView : getPlayerView(gameState, viewerId)),
    [gameState, viewerId],
  );
  const playerMetas = useMemo(() => createPlayerMetas(room), [room]);
  const viewer = playerView.players.find((player) => player.id === viewerId);
  const playerHand = viewer?.hand ?? [];
  const playerRank = viewer?.rank ?? null;
  const selectedCards = playerHand.filter((card) => selectedCardIds.includes(card.id));
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const availableActions =
    gameState === null
      ? { isTurn: false, canPlaySelectedCards: false, canPass: false }
      : getAvailableActions(gameState, viewerId, { selectedCardIds });
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
      const initialHand = gameState.initialHands.find(
        (candidate) => candidate.playerId === rankedPlayerId,
      );

      return {
        cards: initialHand?.cards ?? [],
        kind: meta.kind,
        name: meta.name,
        playerId: rankedPlayerId,
        rank: index + 1,
      };
    });
  }, [gameState, playerMetas]);
  const canStartRematch = room?.status === "finished" && room.hostPlayerId === playerId;

  useEffect(() => {
    if (roomId.length === 0 || playerId.length === 0) {
      setErrorMessage("ルーム情報がありません。");
      return;
    }

    const socket = new PartySocket({
      host: getWorkerHost(),
      party: roomPartyName,
      room: roomId,
      id: playerId,
    });
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      const serverEvent = ServerEventSchema.safeParse(parseMessage(event.data));

      if (!serverEvent.success) {
        setErrorMessage("ゲーム状態を読み取れませんでした。");
        return;
      }

      if (serverEvent.data.type === "error") {
        setErrorMessage(serverEvent.data.message);
        return;
      }

      setRoom(serverEvent.data.room);
      setErrorMessage(null);
    });
    socket.addEventListener("error", () => setErrorMessage("リアルタイム接続に失敗しました。"));

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [playerId, roomId]);

  useEffect(() => {
    setSelectedCardIds((currentIds) =>
      currentIds.filter((cardId) => playerHand.some((card) => card.id === cardId)),
    );
  }, [playerHand]);

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
    socketRef.current?.send(
      JSON.stringify(
        createClientEvent.playCards({
          roomId,
          playerId,
          cardIds: selectedCardIds,
        }),
      ),
    );
    setSelectedCardIds([]);
  }

  function passTurn() {
    socketRef.current?.send(JSON.stringify(createClientEvent.pass({ roomId, playerId })));
    setSelectedCardIds([]);
  }

  function startRematch() {
    socketRef.current?.send(JSON.stringify(createClientEvent.rematch({ roomId, playerId })));
    setSelectedCardIds([]);
  }

  function leaveRoom() {
    socketRef.current?.send(JSON.stringify(createClientEvent.leaveRoom({ roomId, playerId })));
  }

  return {
    availableActions,
    canStartRematch,
    clearSelection,
    errorMessage,
    finalResults,
    leaveRoom,
    opponents,
    passTurn,
    playerHand,
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

function createPlayerMetas(room: RoomState | null): readonly PlayerMeta[] {
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

function parseMessage(message: unknown) {
  if (typeof message !== "string") {
    return null;
  }

  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
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
