type ToggleCardSelectionOptions = {
  cardId: string;
  currentCardIds: readonly string[];
  playableSelection: readonly string[];
  tableCardCount: number | null;
};

function toggleCardSelection({
  cardId,
  currentCardIds,
  playableSelection,
  tableCardCount,
}: ToggleCardSelectionOptions): readonly string[] {
  if (currentCardIds.includes(cardId)) {
    return tableCardCount === null
      ? currentCardIds.filter((selectedId) => selectedId !== cardId)
      : [];
  }

  if (tableCardCount === null) {
    return [...currentCardIds, cardId];
  }

  return [...playableSelection];
}

function retainHandCardSelection(
  selectedCardIds: readonly string[],
  handCardIds: ReadonlySet<string>,
): readonly string[] {
  return selectedCardIds.filter((cardId) => handCardIds.has(cardId));
}

export { retainHandCardSelection, toggleCardSelection };
export type { ToggleCardSelectionOptions };
