import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bot, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { MatchHistoryItem, MatchHistoryPlayer } from "schema";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMatchHistory } from "@/features/rooms/room-api";

type LoadStatus = "error" | "idle" | "loading" | "success";

function RoomHistoryPage() {
  const [matches, setMatches] = useState<readonly MatchHistoryItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setStatus("loading");

      try {
        const data = await getMatchHistory();

        if (!ignore) {
          setMatches(data.matches);
          setStatus("success");
        }
      } catch {
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="ホームに戻る">
          <Link to="/">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">対戦履歴</div>
        <div className="size-9" aria-hidden="true" />
      </header>

      <section className="pt-8 pb-5" aria-labelledby="room-history-title">
        <p className="mb-2 text-xs font-extrabold text-primary uppercase">Match history</p>
        <h1 id="room-history-title" className="text-3xl leading-tight font-extrabold">
          最近の対戦
        </h1>
        <p className="mt-3 max-w-[24em] text-[15px] leading-7 text-muted-foreground">
          終了した対戦の順位、初期手札、残った手札を確認できます。
        </p>
      </section>

      <section className="grid flex-1 content-start gap-3" aria-label="対戦履歴一覧">
        {status === "loading" || status === "idle" ? (
          <HistoryMessage>履歴を読み込んでいます。</HistoryMessage>
        ) : null}
        {status === "error" ? (
          <HistoryMessage>対戦履歴を読み込めませんでした。</HistoryMessage>
        ) : null}
        {status === "success" && matches.length === 0 ? (
          <HistoryMessage>まだ対戦履歴がありません。</HistoryMessage>
        ) : null}
        {matches.map((match) => (
          <MatchHistoryCard key={match.id} match={match} />
        ))}
      </section>
    </main>
  );
}

function HistoryMessage({ children }: { children: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center text-sm font-bold text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function MatchHistoryCard({ match }: { match: MatchHistoryItem }) {
  const winner = match.players.find((player) => player.rank === 1);
  const finishedLabel =
    match.finishedAt === null ? "対戦中" : formatDateTime(new Date(match.finishedAt));

  return (
    <details className="group rounded-lg border bg-card shadow-sm">
      <summary className="grid cursor-pointer list-none gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <Trophy className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base leading-snug font-extrabold">
              {winner === undefined ? "結果集計中" : `${winner.name} が優勝`}
            </div>
            <div className="mt-1 text-[12px] leading-none text-muted-foreground">
              {finishedLabel}
            </div>
          </div>
          <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-md bg-muted px-2 text-xs font-bold text-muted-foreground">
            {match.playerCount}人
          </span>
        </div>
      </summary>

      <div className="grid gap-2 border-t p-3">
        {match.players.map((player) => (
          <HistoryPlayerRow key={player.playerId} player={player} />
        ))}
      </div>
    </details>
  );
}

function HistoryPlayerRow({ player }: { player: MatchHistoryPlayer }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-background p-3">
      <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          {player.kind === "cpu" ? (
            <Bot className="size-4" aria-hidden="true" />
          ) : (
            <Users className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{player.name}</div>
          <div className="mt-1 text-[12px] leading-none text-muted-foreground">
            初期 {player.initialHand.length}枚 / 残り {player.remainingHand.length}枚
          </div>
        </div>
        <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-md bg-primary px-2 text-xs font-extrabold text-primary-foreground">
          {player.rank === null ? "-" : `${player.rank}位`}
        </span>
      </div>
      <HistoryHand label="初期手札" cards={player.initialHand} />
      {player.remainingHand.length > 0 ? (
        <HistoryHand label="残った手札" cards={player.remainingHand} />
      ) : null}
    </div>
  );
}

function HistoryHand({
  cards,
  label,
}: {
  cards: MatchHistoryPlayer["initialHand"];
  label: string;
}) {
  return (
    <div className="mt-3 min-w-0 max-w-full">
      <div className="mb-2 text-[11px] leading-none font-bold text-muted-foreground">{label}</div>
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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export { RoomHistoryPage };
