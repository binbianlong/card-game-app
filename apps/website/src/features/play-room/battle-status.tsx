import type { PlayerGameView } from "game";
import { Bot, Users } from "lucide-react";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  describePlay,
  formatRankings,
  getPlayerMeta,
  type Opponent,
  type PlayerMeta,
} from "./use-play-room-game";

function BattleStatus({
  opponents,
  playerMetas,
  playerView,
}: {
  opponents: Opponent[];
  playerMetas: readonly PlayerMeta[];
  playerView: PlayerGameView;
}) {
  const turnPlayerName = getPlayerMeta(playerMetas, playerView.turnPlayerId).name;
  const tablePlay = playerView.table.play;
  const remainingCount = playerView.players.filter((player) => !player.finished).length;
  const statusTitle = playerView.phase === "finished" ? "対戦終了" : `${turnPlayerName} の手番`;
  const statusDescription =
    playerView.phase === "finished"
      ? formatRankings(playerView.rankings, playerMetas)
      : tablePlay === null
        ? "場が空です。好きな組み合わせでカードを出せます。"
        : `${describePlay(tablePlay)}より強い${tablePlay.cards.length}枚を出すか、パスします。`;

  return (
    <section className="grid gap-3" aria-label="対戦状況">
      <Card className="border-primary/25 bg-primary/5 py-0 shadow-none">
        <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <p className="text-[11px] leading-none font-extrabold text-primary uppercase">
              {playerView.revolution ? "Revolution" : "Round 1"}
            </p>
            <h1 className="mt-1.5 truncate text-xl leading-tight font-extrabold">{statusTitle}</h1>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{statusDescription}</p>
          </div>
          <div className="grid size-14 place-items-center rounded-lg bg-card text-center shadow-xs">
            <div>
              <div className="text-[10px] leading-none font-bold text-muted-foreground">残り</div>
              <div className="mt-1 text-xl leading-none font-extrabold">{remainingCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5" aria-label="参加者一覧">
        <div className="flex w-max min-w-full gap-2">
          {opponents.map((opponent) => (
            <OpponentSeat key={opponent.id} opponent={opponent} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OpponentSeat({ opponent }: { opponent: Opponent }) {
  const isThinking = opponent.status === "thinking";
  const isPassed = opponent.status === "passed";
  const isFinished = opponent.status === "finished";
  const visibleBackCount = Math.min(opponent.cards, 3);

  return (
    <div
      className={
        isThinking
          ? "w-[132px] shrink-0 rounded-lg border border-primary/35 bg-card p-2.5 shadow-sm"
          : "w-[132px] shrink-0 rounded-lg border bg-card p-2.5 shadow-sm"
      }
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          {opponent.kind === "cpu" ? (
            <Bot className="size-4" aria-hidden="true" />
          ) : (
            <Users className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold">{opponent.name}</div>
          <div className="mt-0.5 text-[11px] leading-none text-muted-foreground">
            {opponent.cards}枚{opponent.rank === null ? "" : ` / ${opponent.rank}位`}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex -space-x-4">
          {visibleBackCount > 0 ? (
            Array.from({ length: visibleBackCount }, (_, index) => (
              <PlayingCard
                key={index}
                faceDown
                size="xs"
                tabIndex={-1}
                className="h-12 w-8 rounded-sm px-1 py-1 shadow-none"
              />
            ))
          ) : (
            <div className="grid h-12 w-8 place-items-center rounded-sm border border-dashed bg-muted/40 text-[10px] font-bold text-muted-foreground">
              0
            </div>
          )}
        </div>
        <span className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-[11px] font-bold text-muted-foreground">
          {isFinished ? "上がり" : isThinking ? "思考中" : isPassed ? "パス" : "待機"}
        </span>
      </div>
    </div>
  );
}

export { BattleStatus };
