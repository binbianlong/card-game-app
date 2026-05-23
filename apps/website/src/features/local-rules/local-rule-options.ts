import {
  GitCommitHorizontal,
  LockKeyhole,
  RotateCcw,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import type { GameRuleSettings } from "game";

type LocalRuleKey = keyof GameRuleSettings;

type LocalRuleOption = {
  description: string;
  Icon: LucideIcon;
  key: LocalRuleKey;
  label: string;
};

const defaultLocalRuleSettings = {
  eightCut: false,
  revolution: false,
  sequence: false,
  suitLock: false,
} as const satisfies GameRuleSettings;

const localRuleOptions = [
  {
    key: "eightCut",
    label: "8切り",
    description: "8を含む手を出すと場が流れ、出したプレイヤーから続行します。",
    Icon: Scissors,
  },
  {
    key: "revolution",
    label: "革命",
    description: "4枚組などでカードの強さが逆転します。もう一度革命が起きると戻ります。",
    Icon: RotateCcw,
  },
  {
    key: "sequence",
    label: "階段",
    description: "同じマークの3枚以上の連番をまとめて出せます。",
    Icon: GitCommitHorizontal,
  },
  {
    key: "suitLock",
    label: "縛り",
    description: "同じマークの手が続くと、その場では同じマークだけ出せます。",
    Icon: LockKeyhole,
  },
] as const satisfies readonly LocalRuleOption[];

export { defaultLocalRuleSettings, localRuleOptions };
export type { LocalRuleKey, LocalRuleOption };
