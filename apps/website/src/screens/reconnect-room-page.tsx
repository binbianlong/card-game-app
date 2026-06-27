import { Link } from "@tanstack/react-router";
import { ChevronRight, Radio } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRoomConnections, type RoomConnectionMetadata } from "@/features/rooms/connection-token";

function ReconnectRoomPage() {
  const roomConnections = useState(() =>
    typeof window === "undefined" ? [] : getRoomConnections(),
  )[0];

  return (
    <PageShell>
      <PageHeader backLabel="ホームに戻る" backTo="/" title="ルーム復帰" />
      <RoomConnectionList roomConnections={roomConnections} />
    </PageShell>
  );
}

function RoomConnectionList({
  roomConnections,
}: {
  roomConnections: readonly RoomConnectionMetadata[];
}) {
  return (
    <>
      <PageIntro
        description="保存済みの接続情報から、復帰したい対戦を選んでください。"
        eyebrow="Reconnect"
        title="ルームを選択"
        titleId="reconnect-room-title"
      />
      <section className="grid gap-3" aria-label="復帰できるルーム">
        {roomConnections.length > 0 ? (
          roomConnections.map((connection) => (
            <RoomConnectionCard
              key={`${connection.roomId}:${connection.playerId}`}
              connection={connection}
            />
          ))
        ) : (
          <Card>
            <CardContent className="grid gap-3 px-4 py-4 text-center">
              <p className="text-[13px] leading-5 font-bold text-muted-foreground">
                保存済みのルーム接続情報はありません。
              </p>
              <Button asChild size="lg" className="h-12 w-full text-base font-bold">
                <Link to="/rooms/join">ルームに参加する</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

function RoomConnectionCard({ connection }: { connection: RoomConnectionMetadata }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-auto min-h-20 w-full justify-start gap-3 rounded-lg px-3.5 py-3.5 text-left hover:bg-transparent"
        >
          <Link
            to="/rooms/play"
            search={{
              playerId: connection.playerId,
              roomId: connection.roomId,
            }}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Radio className="size-5" aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-base leading-snug font-bold text-card-foreground">
                ルームに再接続
              </span>
              <span className="text-[13px] leading-5 font-normal text-muted-foreground">
                ルームID {connection.roomId}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export { ReconnectRoomPage };
