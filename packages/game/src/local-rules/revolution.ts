import type { GameRuleSettings, Play } from "../types.ts";

export function getNextRevolution(
  currentRevolution: boolean,
  play: Play,
  rules: GameRuleSettings,
): boolean {
  return rules.revolution && play.causesRevolution ? !currentRevolution : currentRevolution;
}
