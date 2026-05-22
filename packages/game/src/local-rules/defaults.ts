import type { GameRuleSettings } from "../types.ts";

export const DEFAULT_GAME_RULES = {
  eightCut: true,
  revolution: true,
  sequence: true,
  suitLock: false,
} as const satisfies GameRuleSettings;
