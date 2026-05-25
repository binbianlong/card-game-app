import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  defaultLocalRuleSettings,
  type LocalRuleKey,
} from "@/features/local-rules/local-rule-options";
import { useWaitingRoomSocket } from "@/features/waiting-room/use-waiting-room-socket";
import { WaitingRoomView } from "@/features/waiting-room/waiting-room-view";
import { createClientEvent } from "schema";

function WaitingRoomPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/rooms/waiting" });
  const playerCount = search.players;
  const roomId = search.roomId ?? "";
  const playerId = search.playerId ?? "";
  const { connectionStatus, errorMessage, room, sendEvent } = useWaitingRoomSocket({
    playerId,
    roomId,
  });
  const localRules = room?.rules ?? defaultLocalRuleSettings;
  const isConnected = connectionStatus === "open";
  const isReadyToStart =
    room !== null &&
    room.status === "waiting" &&
    room.participants.length >= playerCount &&
    room.participants.some((participant) => participant.id === playerId && participant.ready);

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

  function addParticipant() {
    const humanParticipantCount =
      room?.participants.filter((participant) => participant.kind !== "cpu").length ?? 1;

    sendEvent(
      createClientEvent.joinRoom({
        roomId,
        playerName: `参加者 ${humanParticipantCount + 1}`,
      }),
    );
  }

  function setReady() {
    sendEvent(
      createClientEvent.setReady({
        roomId,
        playerId,
        ready: true,
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
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="ルーム作成に戻る">
          <Link to="/rooms/new">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">待機画面</div>
        <div className="size-9" aria-hidden="true" />
      </header>

      <section className="pt-8 pb-5" aria-labelledby="waiting-room-title">
        <p className="mb-2 text-xs font-extrabold text-primary uppercase">Waiting room</p>
        <h1 id="waiting-room-title" className="text-3xl leading-tight font-extrabold">
          参加者を待機中
        </h1>
        <p className="mt-3 max-w-[24em] text-[15px] leading-7 text-muted-foreground">
          参加者全員が集まると、ゲームを開始できます。
        </p>
      </section>

      <WaitingRoomView
        connectionStatus={connectionStatus}
        errorMessage={errorMessage}
        isConnected={isConnected}
        isReadyToStart={isReadyToStart}
        localRules={localRules}
        onAddParticipant={addParticipant}
        onReady={setReady}
        onStartGame={startGame}
        onToggleLocalRule={toggleLocalRule}
        playerCount={playerCount}
        playerId={playerId}
        room={room}
      />
    </main>
  );
}

export { WaitingRoomPage };
