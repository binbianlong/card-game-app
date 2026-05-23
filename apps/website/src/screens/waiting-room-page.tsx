import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  GitCommitHorizontal,
  LockKeyhole,
  Play,
  RotateCcw,
  Scissors,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function WaitingRoomPage() {
  const search = useSearch({ from: "/rooms/waiting" });
  const playerCount = search.players;
  const cpuCount = search.cpu;
  const [localRules, setLocalRules] = useState<LocalRuleSettings>({
    eightCut: false,
    revolution: false,
    sequence: false,
    suitLock: false,
  });
  const humanCount = playerCount - cpuCount;
  const [joinedHumanCount, setJoinedHumanCount] = useState(1);
  const isReadyToStart = joinedHumanCount >= humanCount;

  function toggleLocalRule(ruleKey: keyof LocalRuleSettings) {
    setLocalRules((currentRules) => ({
      ...currentRules,
      [ruleKey]: !currentRules[ruleKey],
    }));
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

      <WaitingRoom
        cpuCount={cpuCount}
        humanCount={humanCount}
        isReadyToStart={isReadyToStart}
        joinedHumanCount={joinedHumanCount}
        localRules={localRules}
        onToggleLocalRule={toggleLocalRule}
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
  onToggleLocalRule,
  onAddParticipant,
  playerCount,
}: {
  cpuCount: number;
  humanCount: number;
  isReadyToStart: boolean;
  joinedHumanCount: number;
  localRules: LocalRuleSettings;
  onToggleLocalRule: (ruleKey: keyof LocalRuleSettings) => void;
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
        <CardContent className="grid gap-2.5 px-4 pb-4">
          {localRuleItems.map((rule) => (
            <RuleToggle
              key={rule.key}
              description={rule.description}
              enabled={localRules[rule.key]}
              Icon={rule.Icon}
              label={rule.label}
              onClick={() => onToggleLocalRule(rule.key)}
            />
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
  {
    key: "eightCut",
    label: "8切り",
    description: "8を含む手を出すと場が流れ、出したプレイヤーから続行します。",
    Icon: Scissors,
  },
  {
    key: "revolution",
    label: "革命",
    description: "4枚組などでカードの強さが逆転します。もう一度革命が起きると戻ります。",
    Icon: RotateCcw,
  },
  {
    key: "sequence",
    label: "階段",
    description: "同じマークの3枚以上の連番をまとめて出せます。",
    Icon: GitCommitHorizontal,
  },
  {
    key: "suitLock",
    label: "縛り",
    description: "同じマークの手が続くと、その場では同じマークだけ出せます。",
    Icon: LockKeyhole,
  },
] as const satisfies readonly {
  description: string;
  Icon: LucideIcon;
  key: keyof LocalRuleSettings;
  label: string;
}[];

function RuleToggle({
  description,
  enabled,
  Icon,
  label,
  onClick,
}: {
  description: string;
  enabled: boolean;
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onClick}
      className={
        enabled
          ? "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-primary/35 bg-primary/5 p-3.5 text-left shadow-xs"
          : "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3.5 text-left shadow-xs"
      }
    >
      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-base leading-snug font-bold">{label}</span>
        <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={
          enabled
            ? "inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-primary px-2 text-xs font-bold text-primary-foreground"
            : "inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-muted px-2 text-xs font-bold text-muted-foreground"
        }
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </button>
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
