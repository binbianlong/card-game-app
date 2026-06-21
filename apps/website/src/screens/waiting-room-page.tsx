import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import {
  defaultLocalRuleSettings,
  type LocalRuleKey,
} from "@/features/local-rules/local-rule-options";
import { getRoomConnectionToken } from "@/features/rooms/connection-token";
import { useWaitingRoomSocket } from "@/features/waiting-room/use-waiting-room-socket";
import { WaitingRoomView } from "@/features/waiting-room/waiting-room-view";
import { createClientEvent } from "schema";
import { ReconnectRequiredPage } from "./reconnect-required-page";

function WaitingRoomPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/rooms/waiting" });
  const playerCount = search.players;
  const roomId = search.roomId ?? "";
  const playerId = search.playerId ?? "";
  const connectionToken =
    roomId.length === 0 || playerId.length === 0
      ? ""
      : getRoomConnectionToken({ playerId, roomId });
  const hasConnectionToken = connectionToken.length > 0;
  const { connectionStatus, errorMessage, isReconnectRequired, room, sendEvent } =
    useWaitingRoomSocket({
      connectionToken,
      playerId,
      roomId,
    });
  const localRules = room?.rules ?? defaultLocalRuleSettings;
  const isConnected = connectionStatus === "open";
  const isReadyToStart =
    isConnected &&
    room !== null &&
    room.status === "waiting" &&
    room.participants.length === playerCount &&
    room.participants.every((participant) => participant.kind === "cpu" || participant.ready);

  useEffect(() => {
    if (room?.status !== "playing") {
      return;
    }

    void navigate({
      to: "/rooms/play",
      search: {
        players: room.participants.length,
        cpu: room.participants.filter((participant) => participant.kind === "cpu").length,
        roomId: room.id,
        playerId,
        ...room.rules,
      },
    });
  }, [navigate, room]);

  function toggleLocalRule(ruleKey: LocalRuleKey) {
    sendEvent(
      createClientEvent.updateRules({
        roomId,
        playerId,
        rules: {
          ...localRules,
          [ruleKey]: !localRules[ruleKey],
        },
      }),
    );
  }

  function toggleReady() {
    const isReady = room?.participants.some(
      (participant) => participant.id === playerId && participant.ready,
    );

    sendEvent(
      createClientEvent.setReady({
        roomId,
        playerId,
        ready: !isReady,
      }),
    );
  }

  function startGame() {
    sendEvent(
      createClientEvent.startGame({
        roomId,
        playerId,
      }),
    );
  }

  return (
    <PageShell>
      <PageHeader backLabel="ルーム作成に戻る" backTo="/rooms/new" title="待機画面" />
      <PageIntro
        description="参加者全員が集まると、ゲームを開始できます。"
        eyebrow="Waiting room"
        title="参加者を待機中"
        titleId="waiting-room-title"
      />

      {hasConnectionToken && !isReconnectRequired ? (
        <WaitingRoomView
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
          isConnected={isConnected}
          isReadyToStart={isReadyToStart}
          localRules={localRules}
          onStartGame={startGame}
          onToggleLocalRule={toggleLocalRule}
          onToggleReady={toggleReady}
          playerCount={playerCount}
          playerId={playerId}
          room={room}
        />
      ) : (
        <ReconnectRequiredPage />
      )}
    </PageShell>
  );
}

export { WaitingRoomPage };
