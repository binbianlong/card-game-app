import type { GameRuleSettings, Play } from "../types.ts";

export function isEightCutEnabled(play: Play, rules: GameRuleSettings): boolean {
  return rules.eightCut && play.isEightCut;
}
