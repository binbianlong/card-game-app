import {
  type AvailableGameActions,
  type Card as GameCard,
  type Play,
  type PlayerGameView,
  type PlayerId,
} from "game";
import {
  Bot,
  Check,
  CircleSlash,
  Crown,
  Hand,
  LogOut,
  RotateCcw,
  Send,
  Trophy,
  Users,
} from "lucide-react";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  describePlay,
  formatRankings,
  getPlayerMeta,
  type FinalResult,
  type Opponent,
  type PlayerMeta,
} from "./use-play-room-game";

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

function TableArea({
  playerMetas,
  tablePlay,
  tablePlayedBy,
}: {
  playerMetas: readonly PlayerMeta[];
  tablePlay: Play | null;
  tablePlayedBy: PlayerId | null;
}) {
  const tableCards = tablePlay?.cards ?? [];
  const playedByName =
    tablePlayedBy === null ? null : getPlayerMeta(playerMetas, tablePlayedBy).name;

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
          <h2 className="mt-1.5 text-lg leading-tight font-extrabold">
            {tablePlay === null ? "場は空です" : describePlay(tablePlay)}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" disabled>
          <RotateCcw className="size-4" aria-hidden="true" />
          流す
        </Button>
      </div>

      <div className="mt-5 grid justify-items-center gap-3">
        <div className="flex justify-center pl-5">
          {tableCards.length > 0 ? (
            tableCards.map((card, index) => (
              <PlayingCard
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                size="md"
                tabIndex={-1}
                className="shadow-md"
                style={{ marginLeft: index === 0 ? 0 : -20, zIndex: index + 1 }}
              />
            ))
          ) : (
            <div className="grid h-36 w-24 place-items-center rounded-lg border border-dashed bg-muted/40 text-center text-xs leading-5 font-bold text-muted-foreground">
              空
            </div>
          )}
        </div>
        <p className="text-center text-[13px] leading-5 text-muted-foreground">
          {playedByName === null
            ? "最初のカードを待っています。"
            : `最後に出した人: ${playedByName}`}
        </p>
      </div>
    </section>
  );
}

function PlayerArea({
  availableActions,
  onClearSelection,
  onPass,
  onPlaySelectedCards,
  onToggleCard,
  playerHand,
  playableCardIdSet,
  playerRank,
  selectedCards,
  selectedCardIdSet,
}: {
  availableActions: AvailableGameActions;
  onClearSelection: () => void;
  onPass: () => void;
  onPlaySelectedCards: () => void;
  onToggleCard: (cardId: string) => void;
  playerHand: readonly GameCard[];
  playableCardIdSet: ReadonlySet<string>;
  playerRank: number | null;
  selectedCards: readonly GameCard[];
  selectedCardIdSet: ReadonlySet<string>;
}) {
  const hasSelection = selectedCards.length > 0;
  const hasFinished = playerHand.length === 0 && playerRank !== null;

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
              {hasFinished
                ? `${playerRank}位で上がり`
                : `${playerHand.length}枚中 ${selectedCards.length}枚選択`}
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
          {playerHand.length > 0 ? (
            playerHand.map((card, index) => (
              <PlayingCard
                key={card.id}
                rank={card.rank}
                suit={card.suit}
                selected={selectedCardIdSet.has(card.id)}
                size="sm"
                disabled={!playableCardIdSet.has(card.id)}
                onClick={() => onToggleCard(card.id)}
                className="shadow-md"
                style={{ marginLeft: index === 0 ? 0 : -12, zIndex: index + 1 }}
              />
            ))
          ) : (
            <div className="grid h-28 w-20 place-items-center rounded-md border border-dashed bg-muted/40 text-center text-xs leading-5 font-bold text-muted-foreground">
              手札なし
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 text-base font-bold"
          disabled={!availableActions.canPass}
          onClick={onPass}
        >
          <CircleSlash className="size-4" aria-hidden="true" />
          パス
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12 text-base font-bold"
          disabled={!availableActions.canPlaySelectedCards}
          onClick={onPlaySelectedCards}
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

export { BattleStatus, FinishedGameResults, PlayerArea, TableArea };
