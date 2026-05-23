import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Minus,
  Play,
  Plus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const minPlayers = 2;
const maxPlayers = 6;

function CreateRoomPage() {
  const [playerCount, setPlayerCount] = useState(4);
  const [cpuCount, setCpuCount] = useState(1);
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);
  const [joinedHumanCount, setJoinedHumanCount] = useState(1);

  const humanCount = playerCount - cpuCount;
  const maxCpuCount = playerCount - 1;
  const isReadyToStart = joinedHumanCount >= humanCount;

  const roomSummary = useMemo(
    () => [
      { label: "対戦人数", value: `${playerCount}人` },
      { label: "CPU", value: `${cpuCount}人` },
      { label: "参加枠", value: `${humanCount}人` },
    ],
    [cpuCount, humanCount, playerCount],
  );

  function updatePlayerCount(nextValue: number) {
    const nextPlayerCount = clamp(nextValue, minPlayers, maxPlayers);

    setPlayerCount(nextPlayerCount);
    setCpuCount((currentCpuCount) => clamp(currentCpuCount, 0, nextPlayerCount - 1));
    setJoinedHumanCount(1);
  }

  function updateCpuCount(nextValue: number) {
    const nextCpuCount = clamp(nextValue, 0, maxCpuCount);

    setCpuCount(nextCpuCount);
    setJoinedHumanCount((currentCount) => clamp(currentCount, 1, playerCount - nextCpuCount));
  }

  function createRoom() {
    setJoinedHumanCount(1);
    setIsWaitingRoom(true);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="ホームに戻る">
          <Link to="/">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">ルーム作成</div>
        <div className="size-9" aria-hidden="true" />
      </header>

      <section className="pt-8 pb-5" aria-labelledby="create-room-title">
        <p className="mb-2 text-xs font-extrabold text-primary uppercase">
          {isWaitingRoom ? "Waiting room" : "Create room"}
        </p>
        <h1 id="create-room-title" className="text-3xl leading-tight font-extrabold">
          {isWaitingRoom ? "参加者を待機中" : "ルームを作成"}
        </h1>
        <p className="mt-3 max-w-[24em] text-[15px] leading-7 text-muted-foreground">
          {isWaitingRoom
            ? "参加者全員が集まると、ゲームを開始できます。"
            : "対戦人数とCPUの人数を決めて、新しい対戦ルームを準備します。"}
        </p>
      </section>

      {isWaitingRoom ? (
        <WaitingRoom
          cpuCount={cpuCount}
          humanCount={humanCount}
          isReadyToStart={isReadyToStart}
          joinedHumanCount={joinedHumanCount}
          onAddParticipant={() =>
            setJoinedHumanCount((currentCount) => clamp(currentCount + 1, 1, humanCount))
          }
          playerCount={playerCount}
        />
      ) : (
        <form className="grid flex-1 content-start gap-4" aria-label="ルーム作成フォーム">
          <Card>
            <CardHeader className="px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" aria-hidden="true" />
                対戦設定
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-4 pb-4">
              <NumberSetting
                description={`${minPlayers}人から${maxPlayers}人まで選べます。`}
                icon={<Users className="size-5" aria-hidden="true" />}
                label="対戦人数"
                max={maxPlayers}
                min={minPlayers}
                onChange={updatePlayerCount}
                value={playerCount}
              />
              <NumberSetting
                description="最低1人はプレイヤー参加枠として残します。"
                icon={<Bot className="size-5" aria-hidden="true" />}
                label="CPUにする人数"
                max={maxCpuCount}
                min={0}
                onChange={updateCpuCount}
                value={cpuCount}
              />
            </CardContent>
          </Card>

          <Card className="border-primary/25 bg-primary/5 shadow-none">
            <CardContent className="grid gap-3 px-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                {roomSummary.map((item) => (
                  <div key={item.label} className="rounded-lg bg-card p-3 text-center shadow-xs">
                    <div className="text-[11px] leading-none font-bold text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-2 text-lg leading-none font-extrabold">{item.value}</div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="lg"
                className="h-12 w-full text-base font-bold"
                onClick={createRoom}
              >
                作成する
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </main>
  );
}

function WaitingRoom({
  cpuCount,
  humanCount,
  isReadyToStart,
  joinedHumanCount,
  onAddParticipant,
  playerCount,
}: {
  cpuCount: number;
  humanCount: number;
  isReadyToStart: boolean;
  joinedHumanCount: number;
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
            type="button"
            size="lg"
            className="h-12 w-full text-base font-bold"
            disabled={!isReadyToStart}
          >
            <Play className="size-4 fill-current" aria-hidden="true" />
            開始する
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

function NumberSetting({
  description,
  icon,
  label,
  max,
  min,
  onChange,
  value,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const inputId = `${label}-input`;

  return (
    <div className="rounded-lg border bg-card p-3.5">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <label htmlFor={inputId} className="text-base leading-snug font-bold">
            {label}
          </label>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label}を減らす`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="h-11 w-full rounded-md border bg-background px-3 text-center text-lg font-extrabold outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${label}を増やす`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export { CreateRoomPage };
