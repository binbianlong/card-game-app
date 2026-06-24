import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function ReadyStatusBadge({ className, ready }: { className?: string; ready: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold",
        ready ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {ready ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : (
        <Clock className="size-3.5" aria-hidden="true" />
      )}
      {ready ? "準備OK" : "待機中"}
    </span>
  );
}

export { ReadyStatusBadge };
