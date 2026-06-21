import { LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authClient } from "./auth-client";
import { LoginButton } from "./login-button";
import { useNickname } from "./nickname";

function UserSettingsButton() {
  const nicknameInputId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const session = authClient.useSession();
  const { displayName, setNickname } = useNickname();
  const [nicknameInput, setNicknameInput] = useState(displayName);

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="設定">
          <Settings className="size-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-[min(320px,calc(100vw-32px))] rounded-lg p-3.5"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm leading-snug font-bold">ユーザー設定</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              表示名: {displayName.length > 0 ? displayName : "未設定"}
            </div>
          </div>
        </div>

        <label htmlFor={nicknameInputId} className="mt-4 block text-xs font-bold">
          ニックネーム
        </label>
        <input
          id={nicknameInputId}
          type="text"
          value={nicknameInput}
          maxLength={24}
          placeholder="未設定"
          onChange={(event) => setNicknameInput(event.currentTarget.value)}
          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm font-bold outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="button" size="sm" className="mt-3 w-full" onClick={saveNickname}>
          ニックネームを保存
        </Button>

        <div className="mt-3 border-t pt-3">
          {session.data === null || session.data === undefined ? (
            <LoginButton className="w-full" isPending={session.isPending} />
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
      </PopoverContent>
    </Popover>
  );
}

export { UserSettingsButton };
