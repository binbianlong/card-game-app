import { Crown, Settings2, type LucideIcon } from "lucide-react";
import type { GameRuleSettings } from "schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalRuleContent } from "@/features/local-rules/local-rule-content";
import { localRuleOptions, type LocalRuleKey } from "@/features/local-rules/local-rule-options";

function LocalRuleSettings({
  disabled,
  isHost,
  localRules,
  onToggleLocalRule,
}: {
  disabled: boolean;
  isHost: boolean;
  localRules: GameRuleSettings;
  onToggleLocalRule: (ruleKey: LocalRuleKey) => void;
}) {
  return (
    <Card>
      <CardHeader className="px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-primary" aria-hidden="true" />
          採用ルール
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
            <Crown className="size-3" aria-hidden="true" />
            ホストのみ
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5 px-4 pb-4">
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px] leading-5 text-muted-foreground">
          {isHost
            ? "採用するルールを変更できます。"
            : "ルールを変更できるのはホストのみです。現在の設定を確認できます。"}
        </p>
        {localRuleOptions.map((rule) => (
          <RuleToggle
            key={rule.key}
            description={rule.description}
            disabled={disabled}
            enabled={localRules[rule.key]}
            Icon={rule.Icon}
            label={rule.label}
            onClick={() => onToggleLocalRule(rule.key)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RuleToggle({
  disabled,
  description,
  enabled,
  Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  description: string;
  enabled: boolean;
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      disabled={disabled}
      onClick={onClick}
      className={
        enabled
          ? "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-primary/35 bg-primary/5 p-3.5 text-left shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
          : "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3.5 text-left shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      <LocalRuleContent description={description} Icon={Icon} label={label} variant="toggle" />
      <span
        className={
          enabled
            ? "inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-primary px-2 text-xs font-bold text-primary-foreground"
            : "inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-muted px-2 text-xs font-bold text-muted-foreground"
        }
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}

export { LocalRuleSettings };
