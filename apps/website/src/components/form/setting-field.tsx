import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function SettingField({
  children,
  description,
  Icon,
  inputId,
  label,
}: {
  children: ReactNode;
  description: string;
  Icon: LucideIcon;
  inputId: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3.5">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <label htmlFor={inputId} className="text-base leading-snug font-bold">
            {label}
          </label>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export { SettingField };
