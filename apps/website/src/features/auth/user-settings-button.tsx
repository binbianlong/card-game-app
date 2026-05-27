import { LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "./auth-client";
import { useNickname } from "./nickname";

function UserSettingsButton() {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const session = authClient.useSession();
  const fallbackName = session.data?.user.name ?? "あなた";
  const { displayName, setNickname } = useNickname(fallbackName);
  const [nicknameInput, setNicknameInput] = useState(displayName);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setNicknameInput(displayName);
    }
  }, [displayName, isOpen]);

  function saveNickname() {
    setNickname(nicknameInput);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label="設定"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Settings className="size-5" aria-hidden="true" />
      </Button>

      {isOpen ? (
        <div
          id={panelId}
          className="absolute top-11 right-0 z-10 w-[min(320px,calc(100vw-32px))] rounded-lg border bg-card p-3.5 text-card-foreground shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm leading-snug font-bold">ユーザー設定</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                表示名: {displayName}
              </div>
            </div>
          </div>

          <label htmlFor={`${panelId}-nickname`} className="mt-4 block text-xs font-bold">
            ニックネーム
          </label>
          <input
            id={`${panelId}-nickname`}
            type="text"
            value={nicknameInput}
            maxLength={24}
            onChange={(event) => setNicknameInput(event.currentTarget.value)}
            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm font-bold outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button type="button" size="sm" className="mt-3 w-full" onClick={saveNickname}>
            ニックネームを保存
          </Button>

          <div className="mt-3 border-t pt-3">
            {session.data === null || session.data === undefined ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={session.isPending}
                onClick={() => {
                  void authClient.signIn.social({
                    provider: "google",
                  });
                }}
              >
                <LogIn className="size-4" aria-hidden="true" />
                {session.isPending ? "確認中" : "Googleでログイン"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={session.isPending}
                onClick={() => {
                  void authClient.signOut();
                  setIsOpen(false);
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                ログアウト
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { UserSettingsButton };
