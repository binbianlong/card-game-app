import {
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Play,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localRuleOptions, type LocalRuleKey } from "@/features/local-rules/local-rule-options";
import type { ConnectionStatus } from "@/features/waiting-room/use-waiting-room-socket";
import type { GameRuleSettings, RoomParticipant, RoomState } from "schema";

type WaitingRoomViewProps = {
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  isConnected: boolean;
  isReadyToStart: boolean;
  localRules: GameRuleSettings;
  onReady: () => void;
  onStartGame: () => void;
  onToggleLocalRule: (ruleKey: LocalRuleKey) => void;
  playerCount: number;
  playerId: string;
  room: RoomState | null;
};

function WaitingRoomView({
  connectionStatus,
  errorMessage,
  isConnected,
  isReadyToStart,
  localRules,
  onReady,
  onStartGame,
  onToggleLocalRule,
  playerCount,
  playerId,
  room,
}: WaitingRoomViewProps) {
  const participants = room?.participants ?? [];
  const waitingCount = Math.max(playerCount - participants.length, 0);
  const currentParticipant = participants.find((participant) => participant.id === playerId);
  const canReady =
    isConnected &&
    currentParticipant !== undefined &&
    !currentParticipant.ready &&
    room?.status === "waiting";

  return (
    <section className="grid flex-1 content-start gap-4" aria-label="ルーム待機画面">
      <Card className="border-primary/25 bg-primary/5 shadow-none">
        <CardContent className="grid gap-4 px-4 py-4">
          <InviteCodePanel room={room} />
          <div className="grid grid-cols-3 gap-2">
            <RoomStat label="対戦人数" value={`${playerCount}人`} />
            <RoomStat label="参加済み" value={`${participants.length}人`} />
            <RoomStat label="待機中" value={`${waitingCount}人`} />
          </div>
          <div className="rounded-lg bg-card px-3 py-2 text-center text-[13px] leading-5 font-bold text-muted-foreground shadow-xs">
            {getConnectionStatusLabel(connectionStatus)}
          </div>
          {errorMessage !== null ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-[13px] leading-5 font-bold text-destructive">
              {errorMessage}
            </div>
          ) : null}
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
          {participants.length > 0 ? (
            participants.map((participant) => (
              <ParticipantRow key={participant.id} participant={participant} />
            ))
          ) : (
            <div className="rounded-lg bg-muted/60 p-3 text-center text-sm font-bold text-muted-foreground">
              ルーム状態を取得中です。
            </div>
          )}
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
          {localRuleOptions.map((rule) => (
            <RuleToggle
              key={rule.key}
              description={rule.description}
              disabled={!isConnected || room?.status !== "waiting"}
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
            disabled={!canReady}
            onClick={onReady}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            準備OK
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base font-bold"
            disabled={!isReadyToStart}
            onClick={onStartGame}
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

function InviteCodePanel({ room }: { room: RoomState | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card p-3 shadow-xs">
      <div className="min-w-0">
        <div className="text-[11px] leading-none font-bold text-muted-foreground">招待コード</div>
        <div className="mt-1 text-2xl leading-none font-extrabold tracking-[0.16em]">
          {room?.inviteCode ?? "----"}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="招待コードをコピー"
        disabled={room === null}
        onClick={() => {
          if (room !== null) {
            void navigator.clipboard.writeText(room.inviteCode);
          }
        }}
      >
        <Copy className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function RuleToggle({
  disabled,
  description,
  enabled,
  Icon,
  label,
  onClick,
}: {
  disabled: boolean;
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
      disabled={disabled}
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

function ParticipantRow({ participant }: { participant: RoomParticipant }) {
  const isReady = participant.ready;
  const isHost = participant.kind === "host";
  const isCpu = participant.kind === "cpu";

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

function getConnectionStatusLabel(status: ConnectionStatus) {
  switch (status) {
    case "connecting":
      return "接続中";
    case "open":
      return "接続済み";
    case "closed":
      return "未接続";
  }
}

export { WaitingRoomView };
