import { Link, useSearch } from "@tanstack/react-router";
import {
  applyGameAction,
  createNewGame,
  getAvailableActions,
  getPlayerView,
  type Card as GameCard,
  type GameAction,
  type GameState,
  type Play,
  type PlayerGameView,
  type PlayerId,
} from "game";
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
import { useEffect, useMemo, useState } from "react";
import { PlayingCard } from "@/components/playing-card/playing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const viewerId = "player-1";

type PlayerMeta = {
  id: PlayerId;
  kind: "cpu" | "guest" | "host";
  name: string;
};

type Opponent = {
  cards: number;
  id: PlayerId;
  kind: "cpu" | "guest";
  name: string;
  rank: number | null;
  status: "finished" | "passed" | "thinking" | "waiting";
};

function PlayRoomPage() {
  const search = useSearch({ from: "/rooms/play" });
  const playerCount = search.players;
  const cpuCount = search.cpu;
  const playerMetas = useMemo(
    () => createPlayerMetas(playerCount, cpuCount),
    [cpuCount, playerCount],
  );
  const [gameState, setGameState] = useState(() => createInitialGameState(playerMetas));
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const playerView = useMemo(() => getPlayerView(gameState, viewerId), [gameState]);
  const playerHand = playerView.players.find((player) => player.id === viewerId)?.hand ?? [];
  const selectedCards = playerHand.filter((card) => selectedCardIds.includes(card.id));
  const availableActions = getAvailableActions(gameState, viewerId, { selectedCardIds });
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);

  const opponents = useMemo(
    () =>
      playerView.players
        .filter((player) => player.id !== viewerId)
        .map((player): Opponent => {
          const meta = getPlayerMeta(playerMetas, player.id);
          const isCurrentTurn =
            playerView.phase === "playing" && playerView.turnPlayerId === player.id;

          return {
            cards: player.handCount,
            id: player.id,
            kind: meta.kind === "cpu" ? "cpu" : "guest",
            name: meta.name,
            rank: player.rank,
            status: player.finished
              ? "finished"
              : isCurrentTurn
                ? "thinking"
                : playerView.passedPlayerIds.includes(player.id)
                  ? "passed"
                  : "waiting",
          };
        }),
    [playerMetas, playerView],
  );

  useEffect(() => {
    setGameState(createInitialGameState(playerMetas));
    setSelectedCardIds([]);
  }, [playerMetas]);

  useEffect(() => {
    setSelectedCardIds((currentIds) =>
      currentIds.filter((cardId) => playerHand.some((card) => card.id === cardId)),
    );
  }, [playerHand]);

  useEffect(() => {
    if (playerView.phase !== "playing" || playerView.turnPlayerId === viewerId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setGameState((currentState) => {
        if (currentState.phase !== "playing" || currentState.turnPlayerId === viewerId) {
          return currentState;
        }

        const action = createAutoAction(currentState, currentState.turnPlayerId);

        return action === null ? currentState : applyGameAction(currentState, action);
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [playerView.phase, playerView.turnPlayerId]);

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

  function playSelectedCards() {
    setGameState((currentState) =>
      applyGameAction(currentState, {
        type: "playCards",
        playerId: viewerId,
        cardIds: selectedCardIds,
      }),
    );
    setSelectedCardIds([]);
  }

  function passTurn() {
    setGameState((currentState) =>
      applyGameAction(currentState, {
        type: "pass",
        playerId: viewerId,
      }),
    );
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
        <BattleStatus opponents={opponents} playerMetas={playerMetas} playerView={playerView} />
        <TableArea
          playerMetas={playerMetas}
          tablePlay={playerView.table.play}
          tablePlayedBy={playerView.table.playedBy}
        />
        <PlayerArea
          availableActions={availableActions}
          onClearSelection={clearSelection}
          onPass={passTurn}
          onPlaySelectedCards={playSelectedCards}
          onToggleCard={toggleCard}
          playerHand={playerHand}
          selectedCards={selectedCards}
          selectedCardIdSet={selectedCardIdSet}
        />
      </section>
    </main>
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
  selectedCards,
  selectedCardIdSet,
}: {
  availableActions: ReturnType<typeof getAvailableActions>;
  onClearSelection: () => void;
  onPass: () => void;
  onPlaySelectedCards: () => void;
  onToggleCard: (cardId: string) => void;
  playerHand: readonly GameCard[];
  selectedCards: readonly GameCard[];
  selectedCardIdSet: ReadonlySet<string>;
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
              selected={selectedCardIdSet.has(card.id)}
              size="sm"
              disabled={!availableActions.isTurn}
              onClick={() => onToggleCard(card.id)}
              className="shadow-md"
              style={{ marginLeft: index === 0 ? 0 : -12, zIndex: index + 1 }}
            />
          ))}
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

function createPlayerMetas(playerCount: number, cpuCount: number): readonly PlayerMeta[] {
  const humanCount = playerCount - cpuCount;

  return [
    { id: viewerId, kind: "host", name: "あなた" },
    ...Array.from(
      { length: humanCount - 1 },
      (_, index): PlayerMeta => ({
        id: `guest-${index + 1}`,
        kind: "guest",
        name: `参加者 ${index + 2}`,
      }),
    ),
    ...Array.from(
      { length: cpuCount },
      (_, index): PlayerMeta => ({
        id: `cpu-${index + 1}`,
        kind: "cpu",
        name: `CPU ${index + 1}`,
      }),
    ),
  ];
}

function createInitialGameState(playerMetas: readonly PlayerMeta[]): GameState {
  return createNewGame(
    playerMetas.map((player) => player.id),
    { rng: createSeededRandom(playerMetas.map((player) => player.id).join("|")) },
  );
}

function createSeededRandom(seedText: string): () => number {
  let seed = 2166136261;

  for (const character of seedText) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createAutoAction(state: GameState, playerId: PlayerId): GameAction | null {
  const cardIds = findPlayableCardIds(state, playerId);

  if (cardIds !== null) {
    return {
      type: "playCards",
      playerId,
      cardIds,
    };
  }

  if (getAvailableActions(state, playerId).canPass) {
    return {
      type: "pass",
      playerId,
    };
  }

  return null;
}

function findPlayableCardIds(state: GameState, playerId: PlayerId): readonly string[] | null {
  const player = state.players.find((candidate) => candidate.id === playerId);

  if (player === undefined) {
    return null;
  }

  const cardCount = state.table.play?.cards.length ?? 1;

  for (const cardIds of createCardIdCombinations(
    player.hand.map((card) => card.id),
    cardCount,
  )) {
    if (getAvailableActions(state, playerId, { selectedCardIds: cardIds }).canPlaySelectedCards) {
      return cardIds;
    }
  }

  return null;
}

function createCardIdCombinations(
  cardIds: readonly string[],
  count: number,
): readonly (readonly string[])[] {
  if (count <= 0 || count > cardIds.length) {
    return [];
  }

  const combinations: string[][] = [];

  function collect(startIndex: number, currentCardIds: string[]) {
    if (currentCardIds.length === count) {
      combinations.push([...currentCardIds]);
      return;
    }

    for (let index = startIndex; index < cardIds.length; index += 1) {
      currentCardIds.push(cardIds[index]);
      collect(index + 1, currentCardIds);
      currentCardIds.pop();
    }
  }

  collect(0, []);

  return combinations;
}

function getPlayerMeta(playerMetas: readonly PlayerMeta[], playerId: PlayerId): PlayerMeta {
  return (
    playerMetas.find((player) => player.id === playerId) ?? {
      id: playerId,
      kind: "guest",
      name: playerId,
    }
  );
}

function describePlay(play: Play): string {
  switch (play.kind) {
    case "single":
      return play.rank === "JOKER" ? "ジョーカー" : `${play.rank}のシングル`;
    case "set":
      return `${play.rank}の${play.count}枚組`;
    case "sequence":
      return `${play.suit}の${play.lowRank}-${play.highRank}階段`;
  }
}

function formatRankings(rankings: readonly PlayerId[], playerMetas: readonly PlayerMeta[]): string {
  if (rankings.length === 0) {
    return "順位を集計しています。";
  }

  return rankings
    .map((playerId, index) => `${index + 1}位 ${getPlayerMeta(playerMetas, playerId).name}`)
    .join(" / ");
}

export { PlayRoomPage };
