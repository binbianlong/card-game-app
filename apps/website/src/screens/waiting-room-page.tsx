import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Play,
  Settings2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function WaitingRoomPage() {
  const search = useSearch({ from: "/rooms/waiting" });
  const playerCount = search.players;
  const cpuCount = search.cpu;
  const localRules = {
    eightCut: search.eightCut,
    revolution: search.revolution,
    sequence: search.sequence,
    suitLock: search.suitLock,
  };
  const humanCount = playerCount - cpuCount;
  const [joinedHumanCount, setJoinedHumanCount] = useState(1);
  const isReadyToStart = joinedHumanCount >= humanCount;

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

      <WaitingRoom
        cpuCount={cpuCount}
        humanCount={humanCount}
        isReadyToStart={isReadyToStart}
        joinedHumanCount={joinedHumanCount}
        localRules={localRules}
        onAddParticipant={() =>
          setJoinedHumanCount((currentCount) => clamp(currentCount + 1, 1, humanCount))
        }
        playerCount={playerCount}
      />
    </main>
  );
}

function WaitingRoom({
  cpuCount,
  humanCount,
  isReadyToStart,
  joinedHumanCount,
  localRules,
  onAddParticipant,
  playerCount,
}: {
  cpuCount: number;
  humanCount: number;
  isReadyToStart: boolean;
  joinedHumanCount: number;
  localRules: LocalRuleSettings;
  onAddParticipant: () => void;
  playerCount: number;
}) {
  const waitingCount = humanCount - joinedHumanCount;
  const participants = [
    ...Array.from({ length: humanCount }, (_, index) => ({
      id: `human-${index}`,
      name: index === 0 ? "あなた" : `参加者 ${index + 1}`,
      status: index < joinedHumanCount ? "ready" : "waiting",
      type: index === 0 ? "host" : "guest",
    })),
    ...Array.from({ length: cpuCount }, (_, index) => ({
      id: `cpu-${index}`,
      name: `CPU ${index + 1}`,
      status: "ready",
      type: "cpu",
    })),
  ] as const;

  return (
    <section className="grid flex-1 content-start gap-4" aria-label="ルーム待機画面">
      <Card className="border-primary/25 bg-primary/5 shadow-none">
        <CardContent className="grid gap-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-card p-3 shadow-xs">
            <div className="min-w-0">
              <div className="text-[11px] leading-none font-bold text-muted-foreground">
                招待コード
              </div>
              <div className="mt-1 text-2xl leading-none font-extrabold tracking-[0.16em]">
                8QJ4
              </div>
            </div>
            <Button type="button" variant="outline" size="icon" aria-label="招待コードをコピー">
              <Copy className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <RoomStat label="対戦人数" value={`${playerCount}人`} />
            <RoomStat label="参加済み" value={`${joinedHumanCount + cpuCount}人`} />
            <RoomStat label="待機中" value={`${waitingCount}人`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" aria-hidden="true" />
            参加者
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2.5 px-4 pb-4">
          {participants.map((participant) => (
            <ParticipantRow key={participant.id} participant={participant} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4 text-primary" aria-hidden="true" />
            採用ルール
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4">
          {localRuleItems.map((rule) => (
            <RuleBadge key={rule.key} enabled={localRules[rule.key]} label={rule.label} />
          ))}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="grid gap-3 p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isReadyToStart}
            onClick={onAddParticipant}
          >
            <Users className="size-4" aria-hidden="true" />
            参加者が入室
          </Button>
          <Button
            asChild={isReadyToStart}
            size="lg"
            className="h-12 w-full text-base font-bold"
            disabled={!isReadyToStart}
          >
            {isReadyToStart ? (
              <Link
                to="/rooms/play"
                search={{ players: playerCount, cpu: cpuCount, ...localRules }}
              >
                <Play className="size-4 fill-current" aria-hidden="true" />
                開始する
              </Link>
            ) : (
              <>
                <Play className="size-4 fill-current" aria-hidden="true" />
                開始する
              </>
            )}
          </Button>
          {!isReadyToStart ? (
            <p className="text-center text-[13px] leading-5 text-muted-foreground">
              あと{waitingCount}人の参加を待っています。
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

type LocalRuleSettings = {
  eightCut: boolean;
  revolution: boolean;
  sequence: boolean;
  suitLock: boolean;
};

const localRuleItems = [
  { key: "eightCut", label: "8切り" },
  { key: "revolution", label: "革命" },
  { key: "sequence", label: "階段" },
  { key: "suitLock", label: "縛り" },
] as const satisfies readonly { key: keyof LocalRuleSettings; label: string }[];

function RuleBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div
      className={
        enabled
          ? "rounded-lg border border-primary/30 bg-primary/5 p-3 text-center"
          : "rounded-lg border bg-muted/30 p-3 text-center"
      }
    >
      <div className="text-sm leading-none font-extrabold">{label}</div>
      <div
        className={
          enabled
            ? "mt-2 text-[11px] leading-none font-bold text-primary"
            : "mt-2 text-[11px] leading-none font-bold text-muted-foreground"
        }
      >
        {enabled ? "ON" : "OFF"}
      </div>
    </div>
  );
}

function RoomStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-3 text-center shadow-xs">
      <div className="text-[11px] leading-none font-bold text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg leading-none font-extrabold">{value}</div>
    </div>
  );
}

function ParticipantRow({
  participant,
}: {
  participant: {
    name: string;
    status: string;
    type: string;
  };
}) {
  const isReady = participant.status === "ready";
  const isHost = participant.type === "host";
  const isCpu = participant.type === "cpu";

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3.5">
      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {isCpu ? (
          <Bot className="size-5" aria-hidden="true" />
        ) : isHost ? (
          <Crown className="size-5" aria-hidden="true" />
        ) : (
          <Users className="size-5" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <div className="truncate text-base leading-snug font-bold">{participant.name}</div>
        <div className="mt-1 text-[13px] leading-none text-muted-foreground">
          {isCpu ? "CPU" : isHost ? "ホスト" : "ゲスト"}
        </div>
      </div>
      <span
        className={
          isReady
            ? "inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
            : "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-bold text-muted-foreground"
        }
      >
        {isReady ? (
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
        ) : (
          <Clock className="size-3.5" aria-hidden="true" />
        )}
        {isReady ? "準備OK" : "待機中"}
      </span>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export { WaitingRoomPage };
