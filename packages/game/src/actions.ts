import { applyGameAction } from "./state.ts";
import { assertSequenceAllowed } from "./local-rules/sequence.ts";
import { matchesSuitLock } from "./local-rules/suit-lock.ts";
import { analyzePlay, canPlayOn } from "./rules.ts";
import type { AvailableGameActions, GameState, PlayerGameView, PlayerId } from "./types.ts";

export type GetAvailableActionsOptions = {
  selectedCardIds?: readonly string[];
};

export function getAvailableActions(
  state: GameState,
  playerId: PlayerId,
  options: GetAvailableActionsOptions = {},
): AvailableGameActions {
  return {
    isTurn: isPlayerTurn(state, playerId),
    canPlaySelectedCards: canPlaySelectedCards(state, playerId, options.selectedCardIds ?? []),
    canPass: canPass(state, playerId),
  };
}

export function getAvailableViewActions(
  view: PlayerGameView,
  options: GetAvailableActionsOptions = {},
): AvailableGameActions {
  return {
    isTurn: isPlayerViewTurn(view),
    canPlaySelectedCards: canPlaySelectedViewCards(view, options.selectedCardIds ?? []),
    canPass: canPassView(view),
  };
}

export function getPlayableViewCardIds(view: PlayerGameView): readonly string[] {
  if (!isPlayerViewTurn(view)) {
    return [];
  }

  const viewer = view.players.find((player) => player.id === view.viewerId);
  const hand = viewer?.hand ?? [];
  const requiredCardCount = view.table.play?.cards.length ?? 1;
  const playableCardIds = new Set<string>();

  for (const cardIds of combinations(
    hand.map((card) => card.id),
    requiredCardCount,
  )) {
    if (canPlaySelectedViewCards(view, cardIds)) {
      for (const cardId of cardIds) {
        playableCardIds.add(cardId);
      }
    }
  }

  return hand.filter((card) => playableCardIds.has(card.id)).map((card) => card.id);
}

export function canPlaySelectedCards(
  state: GameState,
  playerId: PlayerId,
  cardIds: readonly string[],
): boolean {
  if (cardIds.length === 0) {
    return false;
  }

  return canApply(() =>
    applyGameAction(state, {
      type: "playCards",
      playerId,
      cardIds,
    }),
  );
}

export function canPass(state: GameState, playerId: PlayerId): boolean {
  return canApply(() =>
    applyGameAction(state, {
      type: "pass",
      playerId,
    }),
  );
}

function isPlayerTurn(state: GameState, playerId: PlayerId): boolean {
  return state.phase === "playing" && state.turnPlayerId === playerId;
}

function isPlayerViewTurn(view: PlayerGameView): boolean {
  return view.phase === "playing" && view.turnPlayerId === view.viewerId;
}

function canPlaySelectedViewCards(view: PlayerGameView, cardIds: readonly string[]): boolean {
  if (!isPlayerViewTurn(view) || cardIds.length === 0) {
    return false;
  }

  const viewer = view.players.find((player) => player.id === view.viewerId);
  const hand = viewer?.hand ?? [];
  const cards = cardIds.map((cardId) => hand.find((card) => card.id === cardId));

  if (cards.some((card) => card === undefined)) {
    return false;
  }

  const selectedCards = cards.filter((card) => card !== undefined);
  const play = analyzePlay(selectedCards);

  if (play === null) {
    return false;
  }

  return canApply(() => {
    assertSequenceAllowed(play, view.rules);

    if (
      !canPlayOn(selectedCards, view.table.play, {
        revolution: view.revolution !== view.elevenBack,
      })
    ) {
      throw new Error("Cards cannot be played on the current table.");
    }

    if (!matchesSuitLock(play, view.suitLock)) {
      throw new Error("Cards do not match the current suit lock.");
    }
  });
}

function canPassView(view: PlayerGameView): boolean {
  return isPlayerViewTurn(view) && view.table.play !== null && view.table.playedBy !== null;
}

function canApply(action: () => unknown): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}

function combinations<T>(items: readonly T[], count: number): readonly (readonly T[])[] {
  if (count <= 0 || count > items.length) {
    return [];
  }

  const result: T[][] = [];

  function collect(startIndex: number, current: T[]) {
    if (current.length === count) {
      result.push([...current]);
      return;
    }

    const remainingCount = count - current.length;
    const lastStartIndex = items.length - remainingCount;

    for (let index = startIndex; index <= lastStartIndex; index += 1) {
      current.push(items[index]);
      collect(index + 1, current);
      current.pop();
    }
  }

  collect(0, []);
  return result;
}
