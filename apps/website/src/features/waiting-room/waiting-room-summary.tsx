import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import type { RoomClientState } from "schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConnectionStatus } from "./use-waiting-room-socket";

function WaitingRoomSummary({
  connectionStatus,
  errorMessage,
  participantCount,
  playerCount,
  room,
  waitingCount,
}: {
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  participantCount: number;
  playerCount: number;
  room: RoomClientState | null;
  waitingCount: number;
}) {
  return (
    <Card className="border-primary/25 bg-primary/5 shadow-none">
      <CardContent className="grid gap-4 px-4 py-4">
        <InviteCodePanel room={room} />
        <div className="grid grid-cols-3 gap-2">
          <RoomStat label="対戦人数" value={`${playerCount}人`} />
          <RoomStat label="参加済み" value={`${participantCount}人`} />
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
  );
}

function InviteCodePanel({ room }: { room: RoomClientState | null }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1600);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function copyInviteCode() {
    if (room === null || navigator.clipboard === undefined) {
      return;
    }

    try {
      await navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card p-3 shadow-xs">
      <div className="min-w-0">
        <div className="text-[11px] leading-none font-bold text-muted-foreground">招待コード</div>
        <div className="mt-1 text-2xl leading-none font-extrabold tracking-[0.16em]">
          {room?.inviteCode ?? "------"}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={copied ? "招待コードをコピーしました" : "招待コードをコピー"}
        disabled={room === null}
        onClick={() => {
          void copyInviteCode();
        }}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </Button>
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

export { WaitingRoomSummary };
