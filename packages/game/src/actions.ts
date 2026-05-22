import { applyGameAction } from "./state.ts";
import type { AvailableGameActions, GameState, PlayerId } from "./types.ts";

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

function canApply(action: () => GameState): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}
