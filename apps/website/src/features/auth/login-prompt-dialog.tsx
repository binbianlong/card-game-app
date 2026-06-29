import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginButton } from "./login-button";

type LoginPrompt = "createRoom" | "history" | "joinRoom" | "reconnectRoom";

function LoginPromptDialog({
  isPending,
  onClose,
  prompt,
}: {
  isPending: boolean;
  onClose: () => void;
  prompt: LoginPrompt;
}) {
  const message = getLoginPromptMessage(prompt);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-destructive/30">
        <DialogHeader>
          <DialogTitle className="pr-8 text-[15px] leading-6 font-bold text-destructive">
            {message}
          </DialogTitle>
        </DialogHeader>
        <LoginButton className="h-12 w-full text-base font-bold" isPending={isPending} size="lg" />
      </DialogContent>
    </Dialog>
  );
}

function getLoginPromptMessage(prompt: LoginPrompt) {
  if (prompt === "createRoom") {
    return "未ログインだとルームを作成できません。";
  }

  if (prompt === "history") {
    return "対戦履歴を見るにはログインが必要です。";
  }

  if (prompt === "joinRoom") {
    return "ルームに参加するにはログインが必要です。";
  }

  return "ルームに復帰するにはログインが必要です。";
}

export { LoginPromptDialog };
export type { LoginPrompt };
