import { GameRuleError, type GameRuleSettings, type Play } from "../types.ts";

export function assertSequenceAllowed(play: Play, rules: GameRuleSettings): void {
  if (play.kind === "sequence" && !rules.sequence) {
    throw new GameRuleError("Sequences are disabled by local rules.");
  }
}
