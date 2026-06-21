import { CheckCircle2, Clock, Crown, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function WaitingRoomActions({
  canToggleReady,
  isCurrentPlayerReady,
  isHost,
  isReadyToStart,
  onStartGame,
  onToggleReady,
  waitingCount,
}: {
  canToggleReady: boolean;
  isCurrentPlayerReady: boolean;
  isHost: boolean;
  isReadyToStart: boolean;
  onStartGame: () => void;
  onToggleReady: () => void;
  waitingCount: number;
}) {
  return (
    <Card className="py-0">
      <CardContent className="grid gap-3 p-4">
        <Button
          type="button"
          variant={isCurrentPlayerReady ? "secondary" : "outline"}
          className="w-full"
          disabled={!canToggleReady}
          onClick={onToggleReady}
        >
          {isCurrentPlayerReady ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <Clock className="size-4" aria-hidden="true" />
          )}
          {isCurrentPlayerReady ? "準備OK" : "待機中"}
        </Button>
        {isHost ? (
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
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-3 text-[13px] leading-5 text-muted-foreground">
            <Crown className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>ゲームを開始できるのはホストのみです。準備OKにしてお待ちください。</span>
          </div>
        )}
        <p className="text-center text-[13px] leading-5 text-muted-foreground">
          {getStartStatusLabel({ isHost, isReadyToStart, waitingCount })}
        </p>
      </CardContent>
    </Card>
  );
}

function getStartStatusLabel({
  isHost,
  isReadyToStart,
  waitingCount,
}: {
  isHost: boolean;
  isReadyToStart: boolean;
  waitingCount: number;
}) {
  if (waitingCount > 0) {
    return `あと${waitingCount}人の参加を待っています。`;
  }

  if (!isReadyToStart) {
    return "参加者全員の準備完了を待っています。";
  }

  return isHost
    ? "全員の準備が完了しました。ゲームを開始できます。"
    : "全員の準備が完了しました。ホストの開始を待っています。";
}

export { WaitingRoomActions };
