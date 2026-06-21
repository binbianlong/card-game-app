import type { Card as GameCard, PlayerId } from "game";
import { Bot, Crown, LogOut, RotateCcw, Trophy, Users } from "lucide-react";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FinalResult } from "./use-play-room-game";

function FinishedGameResults({
  canStartRematch,
  finalResults,
  onLeaveRoom,
  onStartRematch,
  playerId,
}: {
  canStartRematch: boolean;
  finalResults: readonly FinalResult[];
  onLeaveRoom: () => void;
  onStartRematch: () => void;
  playerId: PlayerId;
}) {
  const viewerResult = finalResults.find((result) => result.playerId === playerId);
  const winner = finalResults[0];

  return (
    <section
      className="grid min-w-0 flex-1 content-start gap-4 overflow-hidden pt-3"
      aria-label="対戦結果"
    >
      <Card className="min-w-0 border-primary/25 bg-primary/5 py-0 shadow-none">
        <CardContent className="grid min-w-0 gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="size-6 fill-current" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] leading-none font-extrabold text-primary uppercase">
                Game finished
              </p>
              <h1 className="mt-1.5 text-2xl leading-tight font-extrabold">対戦終了</h1>
              <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                {viewerResult === undefined
                  ? "順位と初期手札を確認できます。"
                  : `あなたは${viewerResult.rank}位です。`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ResultStat label="優勝" value={winner?.name ?? "-"} />
            <ResultStat label="参加者" value={`${finalResults.length}人`} />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardContent className="grid min-w-0 gap-3 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-base leading-tight font-extrabold">順位と手札</h2>
          </div>

          <div className="grid gap-2.5">
            {finalResults.map((result) => (
              <FinalResultRow
                key={result.playerId}
                result={result}
                isViewer={result.playerId === playerId}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 py-0">
        <CardContent className="grid min-w-0 gap-2 p-4">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base font-bold"
            disabled={!canStartRematch}
            onClick={onStartRematch}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            もう一回
          </Button>
          {!canStartRematch ? (
            <p className="text-center text-[12px] leading-5 text-muted-foreground">
              再戦を開始できるのはホストです。
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base font-bold"
            onClick={onLeaveRoom}
          >
            <LogOut className="size-4" aria-hidden="true" />
            退出
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-3 text-center shadow-xs">
      <div className="text-[11px] leading-none font-bold text-muted-foreground">{label}</div>
      <div className="mt-2 truncate text-lg leading-none font-extrabold">{value}</div>
    </div>
  );
}

function FinalResultRow({ isViewer, result }: { isViewer: boolean; result: FinalResult }) {
  return (
    <div
      className={
        isViewer
          ? "min-w-0 overflow-hidden rounded-lg border border-primary/35 bg-primary/5 p-3 shadow-xs"
          : "min-w-0 overflow-hidden rounded-lg border bg-card p-3 shadow-xs"
      }
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {result.rank === 1 ? (
            <Crown className="size-5 fill-current" aria-hidden="true" />
          ) : result.kind === "cpu" ? (
            <Bot className="size-5" aria-hidden="true" />
          ) : (
            <Users className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-base leading-snug font-bold">
            {result.name}
            {isViewer ? "（あなた）" : ""}
          </div>
          <div className="mt-1 text-[13px] leading-none text-muted-foreground">
            初期 {result.cards.length}枚 / 残り {result.remainingCards.length}枚
          </div>
        </div>
        <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md bg-primary px-2 text-sm font-extrabold text-primary-foreground">
          {result.rank}位
        </span>
      </div>

      <ResultHandCards label="初期手札" cards={result.cards} />
      {result.remainingCards.length > 0 ? (
        <ResultHandCards label="残った手札" cards={result.remainingCards} />
      ) : null}
    </div>
  );
}

function ResultHandCards({ cards, label }: { cards: readonly GameCard[]; label: string }) {
  return (
    <div className="mt-3 min-w-0 max-w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] leading-none font-bold text-muted-foreground">{label}</div>
        <div className="text-[11px] leading-none font-bold text-muted-foreground">
          {cards.length}枚
        </div>
      </div>
      <div className="min-w-0 max-w-full overflow-x-auto pb-1">
        <div className="flex w-max items-end pl-1 pr-4">
          {cards.map((card, index) => (
            <PlayingCard
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              size="xs"
              tabIndex={-1}
              className="shadow-sm"
              style={{ marginLeft: index === 0 ? 0 : -10, zIndex: index + 1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { FinishedGameResults };
