import type { GameRuleSettings, Play } from "../types.ts";

export function getNextElevenBack(play: Play, rules: GameRuleSettings): boolean {
  return rules.elevenBack && play.cards.some((card) => card.rank === "J");
}
