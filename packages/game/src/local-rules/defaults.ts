import type { GameRuleSettings } from "../types.ts";

export const DEFAULT_GAME_RULES = {
  eightCut: false,
  elevenBack: false,
  revolution: false,
  sequence: false,
  suitLock: false,
} as const satisfies GameRuleSettings;
