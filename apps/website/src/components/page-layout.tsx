import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pageShellClassName =
  "mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7";

type WaitingRoomSearch = {
  cpu: number;
  playerId: string;
  players: number;
  roomId: string;
};

type PageHeaderProps = {
  action?: ReactNode;
  backLabel?: string;
  title: string;
} & (
  | { backSearch?: never; backTo: "/" | "/rooms/history" | "/rooms/new" }
  | { backSearch: WaitingRoomSearch; backTo: "/rooms/waiting" }
);

function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn(pageShellClassName, className)}>{children}</main>;
}

function PageHeader({ action, backLabel = "戻る", backSearch, backTo, title }: PageHeaderProps) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-3">
      <Button asChild variant="ghost" size="icon" aria-label={backLabel}>
        {backTo === "/rooms/waiting" ? (
          <Link to="/rooms/waiting" search={backSearch}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <Link to={backTo}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        )}
      </Button>
      <div className="text-sm font-bold">{title}</div>
      {action ?? <div className="size-9" aria-hidden="true" />}
    </header>
  );
}

function PageIntro({
  description,
  eyebrow,
  title,
  titleId,
}: {
  description: ReactNode;
  eyebrow: string;
  title: string;
  titleId: string;
}) {
  return (
    <section className="pt-8 pb-5" aria-labelledby={titleId}>
      <p className="mb-2 text-xs font-extrabold text-primary uppercase">{eyebrow}</p>
      <h1 id={titleId} className="text-3xl leading-tight font-extrabold">
        {title}
      </h1>
      <p className="mt-3 max-w-[24em] text-[15px] leading-7 text-muted-foreground">{description}</p>
    </section>
  );
}

export { PageHeader, PageIntro, PageShell };
