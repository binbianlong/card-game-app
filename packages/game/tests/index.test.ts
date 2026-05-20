import { describe, expect, test } from "vite-plus/test";
import {
  analyzePlay,
  canPlayOn,
  compareRanks,
  type Card,
  type Rank,
  type Suit,
} from "../src/index.ts";

const card = (rank: Rank, suit: Suit = "spades"): Card => ({
  id: `${suit}-${rank}`,
  rank,
  suit,
});

const joker = (): Card => ({
  id: "joker-1",
  rank: "JOKER",
  suit: "joker",
});

describe("compareRanks", () => {
  test("orders ranks by daifugo strength", () => {
    expect(compareRanks("4", "3")).toBeGreaterThan(0);
    expect(compareRanks("2", "A")).toBeGreaterThan(0);
    expect(compareRanks("JOKER", "2")).toBeGreaterThan(0);
  });

  test("reverses natural rank order during revolution", () => {
    expect(compareRanks("3", "4", { revolution: true })).toBeGreaterThan(0);
    expect(compareRanks("JOKER", "3", { revolution: true })).toBeGreaterThan(0);
  });
});

describe("analyzePlay", () => {
  test("detects a single card", () => {
    expect(analyzePlay([card("8")])).toMatchObject({
      kind: "single",
      rank: "8",
      isEightCut: true,
      causesRevolution: false,
    });
  });

  test("detects a set with a joker", () => {
    expect(analyzePlay([card("Q"), card("Q", "hearts"), joker()])).toMatchObject({
      kind: "set",
      rank: "Q",
      count: 3,
      causesRevolution: false,
    });
  });

  test("detects four of a kind as revolution", () => {
    expect(
      analyzePlay([
        card("5", "clubs"),
        card("5", "diamonds"),
        card("5", "hearts"),
        card("5", "spades"),
      ]),
    ).toMatchObject({
      kind: "set",
      rank: "5",
      count: 4,
      causesRevolution: true,
    });
  });

  test("detects same-suit sequence", () => {
    expect(
      analyzePlay([card("6", "hearts"), card("7", "hearts"), card("8", "hearts")]),
    ).toMatchObject({
      kind: "sequence",
      suit: "hearts",
      lowRank: "6",
      highRank: "8",
      isEightCut: true,
    });
  });

  test("detects sequence with a joker filling a gap", () => {
    expect(analyzePlay([card("6", "clubs"), joker(), card("8", "clubs")])).toMatchObject({
      kind: "sequence",
      suit: "clubs",
      lowRank: "6",
      highRank: "8",
    });
  });

  test("rejects invalid mixed-rank plays", () => {
    expect(analyzePlay([card("6"), card("8")])).toBeNull();
    expect(analyzePlay([card("6", "clubs"), card("7", "hearts"), card("8", "clubs")])).toBeNull();
  });
});

describe("canPlayOn", () => {
  test("allows a stronger same-kind play", () => {
    const previous = analyzePlay([card("9")]);

    expect(canPlayOn([card("10")], previous)).toBe(true);
    expect(canPlayOn([card("8")], previous)).toBe(false);
  });

  test("requires same kind and same card count", () => {
    const previous = analyzePlay([card("9"), card("9", "hearts")]);

    expect(canPlayOn([card("10")], previous)).toBe(false);
    expect(canPlayOn([card("10"), card("10", "clubs")], previous)).toBe(true);
  });

  test("uses reversed ordering during revolution", () => {
    const previous = analyzePlay([card("9")]);

    expect(canPlayOn([card("8")], previous, { revolution: true })).toBe(true);
    expect(canPlayOn([card("10")], previous, { revolution: true })).toBe(false);
  });
});
