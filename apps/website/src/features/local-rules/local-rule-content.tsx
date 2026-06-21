import type { LucideIcon } from "lucide-react";

type LocalRuleContentProps = {
  description: string;
  Icon: LucideIcon;
  label: string;
  variant: "compact" | "detail" | "toggle";
};

function LocalRuleContent({ description, Icon, label, variant }: LocalRuleContentProps) {
  const isCompact = variant === "compact";
  const icon = (
    <span
      className={
        isCompact
          ? "grid size-9 place-items-center rounded-md bg-primary/10 text-primary"
          : "grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"
      }
    >
      <Icon className={isCompact ? "size-4" : "size-5"} aria-hidden="true" />
    </span>
  );

  if (variant === "toggle") {
    return (
      <>
        {icon}
        <span className="min-w-0">
          <span className="block text-base leading-snug font-bold">{label}</span>
          <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
            {description}
          </span>
        </span>
      </>
    );
  }

  return (
    <>
      {icon}
      <div className="min-w-0">
        {variant === "detail" ? (
          <h3 className="text-base leading-snug font-bold">{label}</h3>
        ) : (
          <div className="text-sm leading-snug font-bold">{label}</div>
        )}
        <p
          className={
            variant === "detail"
              ? "mt-1.5 text-[13px] leading-5 text-muted-foreground"
              : "mt-1 text-[13px] leading-5 text-muted-foreground"
          }
        >
          {description}
        </p>
      </div>
    </>
  );
}

export { LocalRuleContent };
