import type { Card, Play, PlayerGameView, PlayerId } from "game";
import { useMemo } from "react";
import type { RoomClientState } from "schema";

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
const emptyPlayerHand: readonly Card[] = [];

function usePlayRoomViewModel({
  playerId,
  room,
}: {
  playerId: string;
  room: RoomClientState | null;
}) {
  const gameState = room?.game ?? null;
  const playerView = gameState ?? emptyPlayerView;
  const playerMetas = useMemo(() => createPlayerMetas(room), [room]);
  const viewer = playerView.players.find((player) => player.id === playerId);
  const playerHand = viewer?.hand ?? emptyPlayerHand;
  const playerRank = viewer?.rank ?? null;
  const opponents = useMemo(
    () =>
      playerView.players
        .filter((player) => player.id !== playerId)
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
    [playerId, playerMetas, playerView],
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

  return {
    canStartRematch: room?.status === "finished" && room.hostPlayerId === playerId,
    finalResults,
    gameState,
    opponents,
    playerHand,
    playerMetas,
    playerRank,
    playerView,
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
      return `${play.rank} 単体`;
    case "set":
      return `${play.rank} ${play.count}枚組`;
    case "sequence":
      return `${play.lowRank}-${play.highRank} 階段`;
  }
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
  usePlayRoomViewModel,
  type FinalResult,
  type Opponent,
  type PlayerMeta,
};
