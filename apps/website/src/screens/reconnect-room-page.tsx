import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, ChevronRight, Crown, LogIn, Radio, Trash2, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReconnectableRoom, ReconnectableRoomParticipant } from "schema";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { removeRoomConnection, saveRoomConnectionToken } from "@/features/rooms/connection-token";
import { endRoom, getReconnectableRooms, reconnectRoom } from "@/features/rooms/room-api";

function ReconnectRoomPage() {
  const [roomConnections, setRoomConnections] = useState<readonly ReconnectableRoom[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadRooms() {
      try {
        const data = await getReconnectableRooms();

        if (isMounted) {
          setRoomConnections(data.rooms);
          setStatus("ready");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadRooms();

    return () => {
      isMounted = false;
    };
  }, []);

  function removeConnection(connection: ReconnectableRoom) {
    removeRoomConnection({ playerId: connection.playerId, roomId: connection.roomId });
    setRoomConnections((connections) =>
      connections.filter(
        (candidate) =>
          candidate.roomId !== connection.roomId || candidate.playerId !== connection.playerId,
      ),
    );
  }

  return (
    <PageShell>
      <PageHeader backLabel="ホームに戻る" backTo="/" title="ルーム復帰" />
      <PageIntro
        description="保存済みのルームから、復帰したい対戦を選んでください。"
        eyebrow="Reconnect"
        title="ルームを選択"
        titleId="reconnect-room-title"
      />
      <section className="grid gap-4" aria-label="復帰できるルーム">
        {status === "loading" ? (
          <ReconnectRoomMessage
            description="復帰できるルームを確認しています。"
            title="ルームを読み込み中"
          />
        ) : null}
        {status === "error" ? (
          <ReconnectRoomMessage
            description="しばらくしてからもう一度開いてください。"
            title="ルームを読み込めませんでした"
          />
        ) : null}
        {status === "ready" && roomConnections.length > 0 ? (
          <div className="grid gap-3">
            {roomConnections.map((connection) => (
              <RoomConnectionCard
                key={`${connection.roomId}:${connection.playerId}`}
                connection={connection}
                onRemoveConnection={removeConnection}
              />
            ))}
          </div>
        ) : null}
        {status === "ready" && roomConnections.length === 0 ? <EmptyReconnectRooms /> : null}
      </section>
    </PageShell>
  );
}

function RoomConnectionCard({
  connection,
  onRemoveConnection,
}: {
  connection: ReconnectableRoom;
  onRemoveConnection: (connection: ReconnectableRoom) => void;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "reconnecting" | "ending" | "error">("idle");

  async function reconnect() {
    setStatus("reconnecting");

    try {
      const data = await reconnectRoom(connection.roomId);
      saveRoomConnectionToken({
        cpuCount: data.room.participants.filter((participant) => participant.kind === "cpu").length,
        connectionToken: data.connectionToken,
        isHost: data.playerId === data.room.hostPlayerId,
        playerId: data.playerId,
        playerCount: data.room.playerCount,
        roomId: data.room.id,
      });

      await navigate({
        to: "/rooms/play",
        search: {
          roomId: data.room.id,
        },
      });
    } catch {
      setStatus("error");
    }
  }

  async function endHostRoom() {
    setStatus("ending");

    try {
      await endRoom(connection.roomId);
      onRemoveConnection(connection);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-3.5">
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-16 w-full justify-start gap-3 rounded-lg px-0 py-0 text-left hover:bg-transparent"
          disabled={status === "reconnecting" || status === "ending"}
          onClick={() => {
            void reconnect();
          }}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Radio className="size-5" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-base leading-snug font-bold text-card-foreground">
              {status === "reconnecting" ? "再接続中" : "ルームに再接続"}
            </span>
            <span className="truncate text-[13px] leading-5 font-normal text-muted-foreground">
              ルームID {connection.roomId}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
        <ReconnectRoomMembers connection={connection} />
        {connection.isHost ? (
          <div className="grid gap-2">
            <Button
              type="button"
              className="h-10 w-full gap-2 text-sm font-bold"
              disabled={status === "reconnecting" || status === "ending"}
              onClick={() => {
                void endHostRoom();
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {status === "ending" ? "終了中" : "ルームを終了"}
            </Button>
            {status === "error" ? (
              <p className="text-center text-[12px] leading-4 font-bold text-destructive">
                操作に失敗しました。
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReconnectRoomMembers({ connection }: { connection: ReconnectableRoom }) {
  const emptySeatCount = Math.max(connection.playerCount - connection.participants.length, 0);

  return (
    <div className="grid gap-2.5 rounded-lg border bg-muted/35 p-3">
      <span className="flex items-center gap-2 text-[12px] leading-4 font-bold text-muted-foreground">
        <Users className="size-3.5" aria-hidden="true" />
        ルームメンバー
      </span>
      {connection.participants.length > 0 ? (
        <div className="grid gap-2">
          {connection.participants.map((participant, index) => (
            <ReconnectRoomMemberItem
              key={`${participant.kind}:${participant.name}:${index}`}
              participant={participant}
            />
          ))}
          {Array.from({ length: emptySeatCount }, (_, index) => (
            <div
              key={`empty-seat:${index}`}
              className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-dashed bg-background/60 px-2.5 py-2 text-muted-foreground"
            >
              <span className="grid size-8 place-items-center rounded-md bg-muted">
                <UserRound className="size-4" aria-hidden="true" />
              </span>
              <span className="truncate text-sm leading-5 font-bold">空き枠</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-background/70 p-3 text-center text-sm font-bold text-muted-foreground">
          メンバー情報なし
        </div>
      )}
    </div>
  );
}

function ReconnectRoomMemberItem({ participant }: { participant: ReconnectableRoomParticipant }) {
  const isHost = participant.kind === "host";
  const isCpu = participant.kind === "cpu";

  return (
    <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-background px-2.5 py-2">
      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
        {isCpu ? (
          <Bot className="size-4" aria-hidden="true" />
        ) : isHost ? (
          <Crown className="size-4" aria-hidden="true" />
        ) : (
          <UserRound className="size-4" aria-hidden="true" />
        )}
      </span>
      <span className="truncate text-sm leading-5 font-bold text-card-foreground">
        {participant.name}
      </span>
      <span className="rounded-md bg-muted px-2 py-1 text-[11px] leading-none font-bold text-muted-foreground">
        {isCpu ? "CPU" : isHost ? "ホスト" : "ゲスト"}
      </span>
    </div>
  );
}

function ReconnectRoomMessage({ description, title }: { description: string; title: string }) {
  return (
    <Card className="border-primary/20 bg-primary/5 shadow-none">
      <CardContent className="grid justify-items-center gap-2 px-4 py-5 text-center">
        <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
          <LogIn className="size-6" aria-hidden="true" />
        </span>
        <div className="grid gap-1.5">
          <p className="text-base leading-snug font-extrabold">{title}</p>
          <p className="mx-auto max-w-[22em] text-[13px] leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyReconnectRooms() {
  return (
    <Card className="border-primary/20 bg-primary/5 shadow-none">
      <CardContent className="grid justify-items-center gap-4 px-4 py-5 text-center">
        <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
          <LogIn className="size-6" aria-hidden="true" />
        </span>
        <div className="grid gap-1.5">
          <p className="text-base leading-snug font-extrabold">保存済みのルームはありません</p>
          <p className="mx-auto max-w-[22em] text-[13px] leading-5 text-muted-foreground">
            招待コードから参加すると、この画面に復帰先が表示されます。
          </p>
        </div>
        <Button asChild size="lg" className="h-12 w-full text-base font-bold">
          <Link to="/rooms/join">ルームに参加する</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export { ReconnectRoomPage };
