import { Link } from "@tanstack/react-router";
import { ChevronRight, Radio, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getRoomConnections,
  removeRoomConnection,
  type RoomConnectionMetadata,
} from "@/features/rooms/connection-token";
import { endRoom } from "@/features/rooms/room-api";

function ReconnectRoomPage() {
  const [roomConnections, setRoomConnections] = useState(() =>
    typeof window === "undefined" ? [] : getRoomConnections(),
  );

  function removeConnection(connection: RoomConnectionMetadata) {
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
              onRemoveConnection={removeConnection}
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
    </PageShell>
  );
}

function RoomConnectionCard({
  connection,
  onRemoveConnection,
}: {
  connection: RoomConnectionMetadata;
  onRemoveConnection: (connection: RoomConnectionMetadata) => void;
}) {
  const [status, setStatus] = useState<"idle" | "ending" | "error">("idle");
  const canEndRoom = connection.isHost || connection.playerId === "player-1";

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
      <CardContent className="grid gap-2 p-3.5">
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-auto min-h-14 w-full justify-start gap-3 rounded-lg px-0 py-0 text-left hover:bg-transparent"
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
        {canEndRoom ? (
          <div className="grid gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-10 w-full gap-2 text-sm font-bold"
              disabled={status === "ending"}
              onClick={() => {
                void endHostRoom();
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {status === "ending" ? "終了中" : "ルームを終了"}
            </Button>
            {status === "error" ? (
              <p className="text-center text-[12px] leading-4 font-bold text-destructive">
                ルームを終了できませんでした。
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { ReconnectRoomPage };
