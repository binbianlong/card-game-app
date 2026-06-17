import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

function ReconnectRequiredPage() {
  return (
    <section className="grid flex-1 content-center gap-5 pb-12 text-center" aria-live="polite">
      <div className="grid justify-items-center gap-3">
        <span className="grid size-14 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <LogIn className="size-7" aria-hidden="true" />
        </span>
        <div className="grid gap-2">
          <h2 className="text-xl leading-tight font-extrabold">ルームに再接続できません</h2>
          <p className="mx-auto max-w-[24em] text-[15px] leading-7 text-muted-foreground">
            このタブではルーム接続情報が見つかりません。招待コードから入り直してください。
          </p>
        </div>
      </div>
      <Button asChild size="lg" className="h-12 w-full text-base font-bold">
        <Link to="/rooms/join">ルームに参加する</Link>
      </Button>
    </section>
  );
}

export { ReconnectRequiredPage };
