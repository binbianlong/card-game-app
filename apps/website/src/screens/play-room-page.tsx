import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleSlash,
  Crown,
  Hand,
  MoreHorizontal,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  PlayingCard,
  type PlayingCardRank,
  type PlayingCardSuit,
} from "@/components/playing-card/playing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type BattleCard = {
  id: string;
  rank: PlayingCardRank;
  suit: PlayingCardSuit;
};

type Opponent = {
  id: string;
  name: string;
  cards: number;
  kind: "cpu" | "guest";
  status: "thinking" | "passed" | "waiting";
};

const playerHand = [
  { id: "spades-3", rank: "3", suit: "spades" },
  { id: "diamonds-5", rank: "5", suit: "diamonds" },
  { id: "clubs-7", rank: "7", suit: "clubs" },
  { id: "hearts-8", rank: "8", suit: "hearts" },
  { id: "spades-10", rank: "10", suit: "spades" },
  { id: "diamonds-j", rank: "J", suit: "diamonds" },
  { id: "clubs-k", rank: "K", suit: "clubs" },
  { id: "hearts-2", rank: "2", suit: "hearts" },
] satisfies BattleCard[];

const tableCards = [
  { id: "table-clubs-9", rank: "9", suit: "clubs" },
  { id: "table-hearts-9", rank: "9", suit: "hearts" },
] satisfies BattleCard[];

function PlayRoomPage() {
  const search = useSearch({ from: "/rooms/play" });
  const playerCount = search.players;
  const cpuCount = search.cpu;
  const humanCount = playerCount - cpuCount;
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const selectedCards = playerHand.filter((card) => selectedCardIds.includes(card.id));

  const opponents = useMemo(
    () =>
      Array.from({ length: playerCount - 1 }, (_, index): Opponent => {
        const cpuIndex = Math.max(0, index - (humanCount - 2));
        const isCpu = index >= humanCount - 1;

        return {
          id: `${isCpu ? "cpu" : "guest"}-${index}`,
          name: isCpu ? `CPU ${cpuIndex + 1}` : `参加者 ${index + 2}`,
          cards: Math.max(3, 8 - index),
          kind: isCpu ? "cpu" : "guest",
          status: index === 0 ? "thinking" : index === 1 ? "passed" : "waiting",
        };
      }),
    [humanCount, playerCount],
  );

  function toggleCard(cardId: string) {
    setSelectedCardIds((currentIds) =>
      currentIds.includes(cardId)
        ? currentIds.filter((selectedId) => selectedId !== cardId)
        : [...currentIds, cardId],
    );
  }

  function clearSelection() {
    setSelectedCardIds([]);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="待機画面に戻る">
          <Link to="/rooms/waiting" search={{ players: playerCount, cpu: cpuCount }}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="text-sm font-bold">対戦中</div>
        <Button variant="ghost" size="icon" aria-label="メニュー">
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <section className="grid flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 pt-3">
        <BattleStatus opponents={opponents} playerCount={playerCount} />
        <TableArea tableCards={tableCards} />
        <PlayerArea
          onClearSelection={clearSelection}
          onToggleCard={toggleCard}
          playerHand={playerHand}
          selectedCards={selectedCards}
          selectedCardIds={selectedCardIds}
        />
      </section>
    </main>
  );
}

function BattleStatus({ opponents, playerCount }: { opponents: Opponent[]; playerCount: number }) {
  return (
    <section className="grid gap-3" aria-label="対戦状況">
      <Card className="border-primary/25 bg-primary/5 py-0 shadow-none">
        <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <p className="text-[11px] leading-none font-extrabold text-primary uppercase">
              Round 1
            </p>
            <h1 className="mt-1.5 truncate text-xl leading-tight font-extrabold">CPU 1 の手番</h1>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              9のペアより強い2枚を出すか、パスします。
            </p>
          </div>
          <div className="grid size-14 place-items-center rounded-lg bg-card text-center shadow-xs">
            <div>
              <div className="text-[10px] leading-none font-bold text-muted-foreground">残り</div>
              <div className="mt-1 text-xl leading-none font-extrabold">{playerCount}</div>
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
            {opponent.cards}枚
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex -space-x-4">
          {Array.from({ length: 3 }, (_, index) => (
            <PlayingCard
              key={index}
              faceDown
              size="xs"
              tabIndex={-1}
              className="h-12 w-8 rounded-sm px-1 py-1 shadow-none"
            />
          ))}
        </div>
        <span className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-[11px] font-bold text-muted-foreground">
          {isThinking ? "思考中" : isPassed ? "パス" : "待機"}
        </span>
      </div>
    </div>
  );
}

function TableArea({ tableCards }: { tableCards: BattleCard[] }) {
  return (
    <section
      className="grid min-h-0 content-center rounded-xl border bg-card/80 p-4 shadow-sm"
      aria-label="場のカード"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] leading-none font-extrabold text-primary uppercase">
            <Crown className="size-3.5 fill-current" aria-hidden="true" />
            Current trick
          </div>
          <h2 className="mt-1.5 text-lg leading-tight font-extrabold">9のペア</h2>
        </div>
        <Button type="button" variant="outline" size="sm">
          <RotateCcw className="size-4" aria-hidden="true" />
          流す
        </Button>
      </div>

      <div className="mt-5 grid justify-items-center gap-3">
        <div className="flex justify-center pl-5">
          {tableCards.map((card, index) => (
            <PlayingCard
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              size="md"
              tabIndex={-1}
              className="shadow-md"
              style={{ marginLeft: index === 0 ? 0 : -20, zIndex: index + 1 }}
            />
          ))}
        </div>
        <p className="text-center text-[13px] leading-5 text-muted-foreground">
          最後に出した人: 参加者 2
        </p>
      </div>
    </section>
  );
}

function PlayerArea({
  onClearSelection,
  onToggleCard,
  playerHand,
  selectedCards,
  selectedCardIds,
}: {
  onClearSelection: () => void;
  onToggleCard: (cardId: string) => void;
  playerHand: BattleCard[];
  selectedCards: BattleCard[];
  selectedCardIds: string[];
}) {
  const hasSelection = selectedCards.length > 0;

  return (
    <section className="grid gap-3" aria-label="あなたの手札">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Hand className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base leading-tight font-extrabold">あなたの手札</h2>
            <p className="text-[13px] leading-5 text-muted-foreground">
              {playerHand.length}枚中 {selectedCards.length}枚選択
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasSelection}
          onClick={onClearSelection}
        >
          解除
        </Button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-end pl-1 pr-4">
          {playerHand.map((card, index) => (
            <PlayingCard
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              selected={selectedCardIds.includes(card.id)}
              size="sm"
              onClick={() => onToggleCard(card.id)}
              className="shadow-md"
              style={{ marginLeft: index === 0 ? 0 : -12, zIndex: index + 1 }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] gap-2">
        <Button type="button" variant="outline" size="lg" className="h-12 text-base font-bold">
          <CircleSlash className="size-4" aria-hidden="true" />
          パス
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12 text-base font-bold"
          disabled={!hasSelection}
        >
          {hasSelection ? (
            <Send className="size-4" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          出す
        </Button>
      </div>
    </section>
  );
}

export { PlayRoomPage };
