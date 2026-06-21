import { Link, useParams } from "@tanstack/react-router";
import { Bot, ChevronDown, ChevronRight, Users } from "lucide-react";
import type { MatchHistoryItem, MatchHistoryPlayer, RoomHistoryItem } from "schema";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { PageHeader, PageIntro, PageShell } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoginButton } from "@/features/auth/login-button";
import { useAuthStatus } from "@/features/auth/use-auth-status";
import { useRoomHistory, useRoomMatchHistory } from "@/features/room-history/use-room-history";

function RoomHistoryPage() {
  const { isLoggedIn, isLoggedOut, isPending } = useAuthStatus();
  const { data, status } = useRoomHistory(isLoggedIn);
  const rooms = data?.rooms ?? [];

  return (
    <PageShell>
      <PageHeader backTo="/" title="対戦履歴" />
      <PageIntro
        description="作成済みルームを選んで、そのルーム内の対戦結果を確認できます。"
        eyebrow="Room history"
        title="ルームごとの履歴"
        titleId="room-history-title"
      />

      <section className="grid flex-1 content-start gap-3" aria-label="ルーム履歴一覧">
        {isLoggedOut ? <HistoryLoginRequired isPending={isPending} /> : null}
        {!isLoggedOut && (status === "loading" || status === "idle") ? (
          <HistoryMessage>履歴を読み込んでいます。</HistoryMessage>
        ) : null}
        {!isLoggedOut && status === "error" ? (
          <HistoryMessage>ルーム履歴を読み込めませんでした。</HistoryMessage>
        ) : null}
        {!isLoggedOut && status === "success" && rooms.length === 0 ? (
          <HistoryMessage>まだ対戦履歴がありません。</HistoryMessage>
        ) : null}
        {!isLoggedOut && rooms.map((room) => <RoomHistoryCard key={room.id} room={room} />)}
      </section>
    </PageShell>
  );
}

function RoomMatchHistoryPage() {
  const { roomId } = useParams({ from: "/rooms/history/$roomId" });
  const { isLoggedIn, isLoggedOut, isPending } = useAuthStatus();
  const { data, status } = useRoomMatchHistory({
    enabled: isLoggedIn,
    roomId,
  });
  const matches = data?.matches ?? [];
  const room = data?.room ?? null;

  return (
    <PageShell>
      <PageHeader backTo="/rooms/history" title="ルーム履歴" />
      <PageIntro
        description={
          room === null
            ? "このルームで終了した対戦を確認できます。"
            : `${formatDateTime(new Date(room.createdAt))} 作成 / ${room.matchCount}戦`
        }
        eyebrow="Match history"
        title="ルーム内の対戦"
        titleId="match-history-title"
      />

      <section className="grid flex-1 content-start gap-3" aria-label="対戦履歴一覧">
        {isLoggedOut ? <HistoryLoginRequired isPending={isPending} /> : null}
        {!isLoggedOut && (status === "loading" || status === "idle") ? (
          <HistoryMessage>履歴を読み込んでいます。</HistoryMessage>
        ) : null}
        {!isLoggedOut && status === "error" ? (
          <HistoryMessage>対戦履歴を読み込めませんでした。</HistoryMessage>
        ) : null}
        {!isLoggedOut && status === "success" && matches.length === 0 ? (
          <HistoryMessage>このルームにはまだ対戦履歴がありません。</HistoryMessage>
        ) : null}
        {!isLoggedOut && matches.map((match) => <MatchHistoryCard key={match.id} match={match} />)}
      </section>
    </PageShell>
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

function HistoryLoginRequired({ isPending }: { isPending: boolean }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-none">
      <CardContent className="grid gap-3 px-4 py-4">
        <p className="text-center text-[13px] leading-5 font-bold text-destructive">
          対戦履歴を見るにはログインが必要です。
        </p>
        <LoginButton className="h-12 w-full text-base font-bold" isPending={isPending} size="lg" />
      </CardContent>
    </Card>
  );
}

function RoomHistoryCard({ room }: { room: RoomHistoryItem }) {
  const latestLabel =
    room.latestFinishedAt === null
      ? "終了済み対戦なし"
      : `最終対戦 ${formatDateTime(new Date(room.latestFinishedAt))}`;

  return (
    <Card>
      <CardContent className="p-0">
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-auto min-h-24 w-full justify-start gap-3 rounded-lg px-3.5 py-3.5 text-left hover:bg-transparent"
        >
          <Link to="/rooms/history/$roomId" params={{ roomId: room.id }}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base leading-snug font-extrabold">
                {formatDateTime(new Date(room.createdAt))}
              </span>
              <span className="mt-1 block text-[12px] leading-none text-muted-foreground">
                ルームID {room.id}
              </span>
              <span className="mt-2 block text-[12px] leading-none font-bold text-muted-foreground">
                {room.matchCount}戦 / {room.playerCount}人 / {latestLabel}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </Button>
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-base leading-snug font-extrabold">
              {winner === undefined ? "結果集計中" : `${winner.name} が優勝`}
            </div>
            <div className="mt-1 text-[12px] leading-none text-muted-foreground">
              {finishedLabel}
            </div>
          </div>
          <span className="grid size-7 place-items-center text-muted-foreground transition-transform group-open:rotate-180">
            <ChevronDown className="size-4" aria-hidden="true" />
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

export { RoomHistoryPage, RoomMatchHistoryPage };
