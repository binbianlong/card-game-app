import { Bot, Crown, Users } from "lucide-react";
import type { RoomParticipant } from "schema";
import { ReadyStatusBadge } from "@/components/ready-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ParticipantList({ participants }: { participants: readonly RoomParticipant[] }) {
  return (
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
  );
}

function ParticipantRow({ participant }: { participant: RoomParticipant }) {
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
      <ReadyStatusBadge ready={participant.ready} />
    </div>
  );
}

export { ParticipantList };
