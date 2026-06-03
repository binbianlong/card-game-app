import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, History, LogIn, Plus, Spade } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/features/auth/auth-client";
import { LoginPromptDialog, type LoginPrompt } from "@/features/auth/login-prompt-dialog";
import { UserSettingsButton } from "@/features/auth/user-settings-button";

const actions = [
  {
    title: "ルームを作成",
    description: "新しい対戦ルームを開く",
    to: "/rooms/new",
    icon: Plus,
  },
  {
    title: "ルームに参加",
    description: "招待コードで合流する",
    to: "/rooms/join",
    icon: LogIn,
  },
  {
    title: "対戦履歴",
    description: "最近の結果を確認する",
    to: "/rooms/history",
    icon: History,
  },
  {
    title: "ルールを確認",
    description: "基本ルールとローカル設定",
    to: "/rules",
    icon: BookOpen,
  },
] as const;

type HomeAction = (typeof actions)[number];

const actionButtonClassName =
  "h-auto min-h-20 w-full justify-start gap-3 rounded-lg px-3.5 py-3.5 text-left hover:bg-transparent";

function App() {
  const session = authClient.useSession();
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt | null>(null);
  const isLoggedOut = !session.isPending && (session.data === null || session.data === undefined);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[430px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:min-h-[min(820px,100svh)] sm:px-5 sm:pt-5 sm:pb-7">
      <header className="flex min-h-11 items-center justify-between gap-3" aria-label="ホーム">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border bg-card text-primary shadow-sm">
            <Spade className="size-4 fill-current" aria-hidden="true" />
          </span>
          <span className="truncate text-[15px] font-bold">Card Room</span>
        </div>
        <UserSettingsButton />
      </header>

      <section className="pt-10 pb-7" aria-labelledby="home-title">
        <p className="mb-2 text-xs font-extrabold text-primary uppercase">Online card battle</p>
        <h1 id="home-title" className="max-w-[9em] text-4xl leading-[1.08] font-extrabold">
          カード対戦をはじめる
        </h1>
        <p className="mt-3.5 max-w-[22em] text-[15px] leading-7 text-muted-foreground">
          ルームを作って、友だちとすぐに対戦できます。
        </p>
      </section>

      <section className="grid gap-3" aria-label="メニュー">
        {actions.map((action) => (
          <HomeActionCard
            key={action.title}
            action={action}
            isLoggedOut={isLoggedOut}
            onLoginPrompt={setLoginPrompt}
          />
        ))}
      </section>

      {loginPrompt !== null && isLoggedOut ? (
        <LoginPromptDialog
          isPending={session.isPending}
          prompt={loginPrompt}
          onClose={() => setLoginPrompt(null)}
        />
      ) : null}
    </main>
  );
}

function HomeActionCard({
  action,
  isLoggedOut,
  onLoginPrompt,
}: {
  action: HomeAction;
  isLoggedOut: boolean;
  onLoginPrompt: (prompt: LoginPrompt) => void;
}) {
  const Icon = action.icon;
  const isCreateRoomAction = action.to === "/rooms/new";
  const isJoinRoomAction = action.to === "/rooms/join";
  const isDisabled = isCreateRoomAction && isLoggedOut;
  const shouldShowJoinPrompt = isJoinRoomAction && isLoggedOut;

  return (
    <Card>
      <CardContent className="p-0">
        {isDisabled ? (
          <Button
            type="button"
            variant="ghost"
            aria-disabled="true"
            className={`${actionButtonClassName} opacity-50 grayscale`}
            onClick={() => onLoginPrompt("createRoom")}
          >
            <ActionContent
              description={action.description}
              icon={<Icon className="size-5" aria-hidden="true" />}
              title={action.title}
            />
          </Button>
        ) : shouldShowJoinPrompt ? (
          <Button
            type="button"
            variant="ghost"
            className={actionButtonClassName}
            onClick={() => onLoginPrompt("joinRoom")}
          >
            <ActionContent
              description={action.description}
              icon={<Icon className="size-5" aria-hidden="true" />}
              title={action.title}
            />
          </Button>
        ) : (
          <Button asChild type="button" variant="ghost" className={actionButtonClassName}>
            <Link to={action.to}>
              <ActionContent
                description={action.description}
                icon={<Icon className="size-5" aria-hidden="true" />}
                title={action.title}
              />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ActionContent({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-base leading-snug font-bold text-card-foreground">{title}</span>
        <span className="text-[13px] leading-5 font-normal text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );
}

export default App;
