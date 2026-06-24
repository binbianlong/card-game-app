import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AvailableGameActions, Card, Play, PlayerGameView } from "game";
import { BattleStatus, FinishedGameResults, PlayerArea, TableArea } from "./play-room-sections";
import type { FinalResult, Opponent, PlayerMeta } from "./play-room-view-model";

const noop = () => {};

const playerId = "player";
const playerMetas = [
  { id: playerId, kind: "host", name: "あなた", ready: true },
  { id: "guest-1", kind: "guest", name: "ゲストA", ready: false },
  { id: "cpu-1", kind: "cpu", name: "CPU 1", ready: true },
  { id: "cpu-2", kind: "cpu", name: "CPU 2", ready: true },
] satisfies PlayerMeta[];

const rules = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  sequence: true,
  suitLock: false,
};

const playerHand = [
  card("3", "diamonds", "player-3d"),
  card("5", "clubs", "player-5c"),
  card("8", "hearts", "player-8h"),
  card("8", "spades", "player-8s"),
  card("J", "clubs", "player-jc"),
  card("A", "spades", "player-as"),
  card("2", "hearts", "player-2h"),
  { id: "player-joker", rank: "JOKER", suit: "joker" },
] satisfies Card[];

const tableSet = {
  kind: "set",
  rank: "7",
  count: 2,
  cards: [card("7", "hearts", "table-7h"), card("7", "spades", "table-7s")],
  isEightCut: false,
  causesRevolution: false,
} satisfies Play;

const tableSequence = {
  kind: "sequence",
  suit: "clubs",
  lowRank: "9",
  highRank: "J",
  count: 3,
  cards: [
    card("9", "clubs", "table-9c"),
    card("10", "clubs", "table-10c"),
    card("J", "clubs", "table-jc"),
  ],
  isEightCut: false,
  causesRevolution: false,
} satisfies Play;

const opponents = [
  { id: "guest-1", kind: "guest", name: "ゲストA", cards: 6, rank: null, status: "thinking" },
  { id: "cpu-1", kind: "cpu", name: "CPU 1", cards: 4, rank: null, status: "passed" },
  { id: "cpu-2", kind: "cpu", name: "CPU 2", cards: 0, rank: 1, status: "finished" },
] satisfies Opponent[];

const playerView = createPlayerView();
const selectedCardIdSet = new Set(["player-8h", "player-8s"]);
const selectedCards = playerHand.filter((cardItem) => selectedCardIdSet.has(cardItem.id));
const playableCardIdSet = new Set([
  "player-8h",
  "player-8s",
  "player-jc",
  "player-as",
  "player-2h",
  "player-joker",
]);

const meta = {
  title: "Features/PlayRoom/Sections",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[390px] max-w-[calc(100vw-32px)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const InTurnWithSelection: Story = {
  render: () => (
    <section className="grid gap-3">
      <BattleStatus opponents={opponents} playerMetas={playerMetas} playerView={playerView} />
      <TableArea playerMetas={playerMetas} tablePlay={tableSet} tablePlayedBy="guest-1" />
      <PlayerArea
        availableActions={{ isTurn: true, canPass: true, canPlaySelectedCards: true }}
        onClearSelection={noop}
        onPass={noop}
        onPlaySelectedCards={noop}
        onToggleCard={noop}
        playerHand={playerHand}
        playableCardIdSet={playableCardIdSet}
        playerRank={null}
        selectedCards={selectedCards}
        selectedCardIdSet={selectedCardIdSet}
      />
    </section>
  ),
};

export const WaitingForOpponent: Story = {
  render: () => (
    <section className="grid gap-3">
      <BattleStatus
        opponents={opponents}
        playerMetas={playerMetas}
        playerView={createPlayerView({ turnPlayerId: "guest-1" })}
      />
      <TableArea playerMetas={playerMetas} tablePlay={tableSequence} tablePlayedBy="cpu-1" />
      <PlayerArea
        availableActions={{ isTurn: false, canPass: false, canPlaySelectedCards: false }}
        onClearSelection={noop}
        onPass={noop}
        onPlaySelectedCards={noop}
        onToggleCard={noop}
        playerHand={playerHand}
        playableCardIdSet={new Set()}
        playerRank={null}
        selectedCards={[]}
        selectedCardIdSet={new Set()}
      />
    </section>
  ),
};

export const EmptyTable: Story = {
  render: () => (
    <section className="grid gap-3">
      <BattleStatus
        opponents={opponents}
        playerMetas={playerMetas}
        playerView={createPlayerView({ table: { play: null, playedBy: null } })}
      />
      <TableArea playerMetas={playerMetas} tablePlay={null} tablePlayedBy={null} />
    </section>
  ),
};

export const FinishedPlayerHand: Story = {
  render: () => (
    <PlayerArea
      availableActions={{ isTurn: false, canPass: false, canPlaySelectedCards: false }}
      onClearSelection={noop}
      onPass={noop}
      onPlaySelectedCards={noop}
      onToggleCard={noop}
      playerHand={[]}
      playableCardIdSet={new Set()}
      playerRank={2}
      selectedCards={[]}
      selectedCardIdSet={new Set()}
    />
  ),
};

export const FinishedResultsHost: Story = {
  render: () => (
    <FinishedGameResults
      canStartRematch
      finalResults={finalResults}
      isCurrentPlayerReady
      isReadyToStartRematch
      onLeaveRoom={noop}
      onStartRematch={noop}
      onToggleReady={noop}
      playerId={playerId}
    />
  ),
};

export const FinishedResultsGuest: Story = {
  render: () => (
    <FinishedGameResults
      canStartRematch={false}
      finalResults={finalResults}
      isCurrentPlayerReady={false}
      isReadyToStartRematch={false}
      onLeaveRoom={noop}
      onStartRematch={noop}
      onToggleReady={noop}
      playerId="guest-1"
    />
  ),
};

function card(
  rank: Exclude<Card["rank"], "JOKER">,
  suit: Exclude<Card["suit"], "joker">,
  id: string,
) {
  return { id, rank, suit };
}

function createPlayerView(overrides: Partial<PlayerGameView> = {}): PlayerGameView {
  return {
    matchId: "match-1",
    phase: "playing",
    rules,
    viewerId: playerId,
    players: [
      {
        id: playerId,
        connected: true,
        handCount: playerHand.length,
        hand: playerHand,
        finished: false,
        rank: null,
      },
      { id: "guest-1", connected: true, handCount: 6, hand: null, finished: false, rank: null },
      { id: "cpu-1", connected: true, handCount: 4, hand: null, finished: false, rank: null },
      { id: "cpu-2", connected: true, handCount: 0, hand: null, finished: true, rank: 1 },
    ],
    turnPlayerId: playerId,
    table: {
      play: tableSet,
      playedBy: "guest-1",
    },
    passedPlayerIds: ["cpu-1"],
    elevenBack: false,
    revolution: false,
    suitLock: null,
    rankings: ["cpu-2"],
    ...overrides,
  };
}

const finalResults = [
  {
    playerId: "cpu-2",
    kind: "cpu",
    name: "CPU 2",
    rank: 1,
    ready: true,
    cards: [
      card("3", "clubs", "cpu2-3c"),
      card("4", "clubs", "cpu2-4c"),
      card("5", "clubs", "cpu2-5c"),
      card("6", "clubs", "cpu2-6c"),
    ],
    remainingCards: [],
  },
  {
    playerId,
    kind: "host",
    name: "あなた",
    rank: 2,
    ready: true,
    cards: playerHand,
    remainingCards: [card("2", "hearts", "result-2h")],
  },
  {
    playerId: "guest-1",
    kind: "guest",
    name: "ゲストA",
    rank: 3,
    ready: false,
    cards: [
      card("4", "diamonds", "guest-4d"),
      card("9", "diamonds", "guest-9d"),
      card("Q", "spades", "guest-qs"),
    ],
    remainingCards: [card("Q", "spades", "guest-remain-qs"), card("A", "clubs", "guest-remain-ac")],
  },
] satisfies FinalResult[];

const _actionsCheck = {
  isTurn: true,
  canPass: true,
  canPlaySelectedCards: true,
} satisfies AvailableGameActions;

void _actionsCheck;
