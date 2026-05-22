import type { GameRuleSettings } from "../types.ts";

export const DEFAULT_GAME_RULES = {
  suitLock: false,
} as const satisfies GameRuleSettings;
