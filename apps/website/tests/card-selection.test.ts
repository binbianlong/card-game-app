import { describe, expect, test } from "vite-plus/test";
import {
  retainHandCardSelection,
  toggleCardSelection,
} from "../src/features/play-room/card-selection.ts";

describe("card selection", () => {
  test("toggles individual cards when the table is empty", () => {
    expect(
      toggleCardSelection({
        cardId: "card-2",
        currentCardIds: ["card-1"],
        playableSelection: ["card-2"],
        tableCardCount: null,
      }),
    ).toEqual(["card-1", "card-2"]);

    expect(
      toggleCardSelection({
        cardId: "card-1",
        currentCardIds: ["card-1", "card-2"],
        playableSelection: ["card-1"],
        tableCardCount: null,
      }),
    ).toEqual(["card-2"]);
  });

  test.each([
    { tableCardCount: 1, playableSelection: ["card-2"] },
    { tableCardCount: 2, playableSelection: ["card-2", "card-3"] },
    { tableCardCount: 3, playableSelection: ["card-2", "card-3", "card-4"] },
  ])("replaces the selection for a $tableCardCount-card table play", (testCase) => {
    expect(
      toggleCardSelection({
        cardId: "card-2",
        currentCardIds: ["card-1"],
        playableSelection: testCase.playableSelection,
        tableCardCount: testCase.tableCardCount,
      }),
    ).toEqual(testCase.playableSelection);
  });

  test("clears the complete selection when a selected table response is clicked", () => {
    expect(
      toggleCardSelection({
        cardId: "card-2",
        currentCardIds: ["card-2", "card-3"],
        playableSelection: ["card-2", "card-3"],
        tableCardCount: 2,
      }),
    ).toEqual([]);
  });

  test("removes selected cards that are no longer in the hand", () => {
    expect(
      retainHandCardSelection(["card-1", "card-2", "card-3"], new Set(["card-1", "card-3"])),
    ).toEqual(["card-1", "card-3"]);
  });
});
