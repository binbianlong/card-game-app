export type Suit = "clubs" | "diamonds" | "hearts" | "spades";

export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";

export type Card =
  | {
      id: string;
      rank: Rank;
      suit: Suit;
    }
  | {
      id: string;
      rank: "JOKER";
      suit: "joker";
    };

export type PlayKind = "single" | "set" | "sequence";

export type Play =
  | {
      kind: "single";
      cards: readonly Card[];
      rank: Rank | "JOKER";
      isEightCut: boolean;
      causesRevolution: boolean;
    }
  | {
      kind: "set";
      cards: readonly Card[];
      rank: Rank;
      count: number;
      isEightCut: boolean;
      causesRevolution: boolean;
    }
  | {
      kind: "sequence";
      cards: readonly Card[];
      suit: Suit;
      lowRank: Rank;
      highRank: Rank;
      count: number;
      isEightCut: boolean;
      causesRevolution: boolean;
    };

export type RuleOptions = {
  revolution?: boolean;
};

export type GameRuleSettings = {
  eightCut: boolean;
  elevenBack: boolean;
  revolution: boolean;
  sequence: boolean;
  suitLock: boolean;
};

export type PlayerId = string;

export type PlayerState = {
  id: PlayerId;
  hand: readonly Card[];
  connected: boolean;
};

export type InitialHandSnapshot = {
  playerId: PlayerId;
  cards: readonly Card[];
};

export type PlayerViewState = {
  id: PlayerId;
  connected: boolean;
  handCount: number;
  hand: readonly Card[] | null;
  finished: boolean;
  rank: number | null;
};

export type GamePhase = "playing" | "finished";

export type GameState = {
  phase: GamePhase;
  rules: GameRuleSettings;
  players: readonly PlayerState[];
  initialHands: readonly InitialHandSnapshot[];
  turnPlayerId: PlayerId;
  table: {
    play: Play | null;
    playedBy: PlayerId | null;
  };
  passedPlayerIds: readonly PlayerId[];
  elevenBack: boolean;
  revolution: boolean;
  suitLock: readonly Suit[] | null;
  rankings: readonly PlayerId[];
};

export type PlayerGameView = {
  phase: GamePhase;
  rules: GameRuleSettings;
  viewerId: PlayerId;
  players: readonly PlayerViewState[];
  turnPlayerId: PlayerId;
  table: {
    play: Play | null;
    playedBy: PlayerId | null;
  };
  passedPlayerIds: readonly PlayerId[];
  elevenBack: boolean;
  revolution: boolean;
  suitLock: readonly Suit[] | null;
  rankings: readonly PlayerId[];
};

export type AvailableGameActions = {
  isTurn: boolean;
  canPlaySelectedCards: boolean;
  canPass: boolean;
};

export type GameAction =
  | {
      type: "playCards";
      playerId: PlayerId;
      cardIds: readonly string[];
    }
  | {
      type: "pass";
      playerId: PlayerId;
    }
  | {
      type: "disconnect";
      playerId: PlayerId;
    }
  | {
      type: "reconnect";
      playerId: PlayerId;
    };

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}
