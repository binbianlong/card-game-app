import {
  getAvailableViewActions,
  getPlayableViewCardIds,
  getPlayableViewSelection,
  type Card,
  type PlayerGameView,
} from "game";
import { useEffect, useMemo, useState } from "react";
import { retainHandCardSelection, toggleCardSelection } from "./card-selection";

function usePlayerCardSelection({
  gameState,
  playerHand,
}: {
  gameState: PlayerGameView | null;
  playerHand: readonly Card[];
}) {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const selectedCards = playerHand.filter((card) => selectedCardIds.includes(card.id));
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const playableCardIdSet = useMemo(
    () => new Set(gameState === null ? [] : getPlayableViewCardIds(gameState)),
    [gameState],
  );
  const availableActions =
    gameState === null
      ? { isTurn: false, canPlaySelectedCards: false, canPass: false }
      : getAvailableViewActions(gameState, { selectedCardIds });

  useEffect(() => {
    const handCardIds = new Set(playerHand.map((card) => card.id));
    setSelectedCardIds((currentIds) => [...retainHandCardSelection(currentIds, handCardIds)]);
  }, [playerHand]);

  function toggleCard(cardId: string) {
    const tableCardCount = gameState?.table.play?.cards.length ?? null;
    const playableSelection = gameState === null ? [] : getPlayableViewSelection(gameState, cardId);

    setSelectedCardIds((currentIds) => [
      ...toggleCardSelection({
        cardId,
        currentCardIds: currentIds,
        playableSelection,
        tableCardCount,
      }),
    ]);
  }

  function clearSelection() {
    setSelectedCardIds([]);
  }

  return {
    availableActions,
    clearSelection,
    playableCardIdSet,
    selectedCardIds,
    selectedCardIdSet,
    selectedCards,
    toggleCard,
  };
}

export { usePlayerCardSelection };
