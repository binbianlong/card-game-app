import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginButton } from "./login-button";

type LoginPrompt = "createRoom" | "joinRoom";

function LoginPromptDialog({
  isPending,
  onClose,
  prompt,
}: {
  isPending: boolean;
  onClose: () => void;
  prompt: LoginPrompt;
}) {
  const message =
    prompt === "createRoom"
      ? "未ログインだとルームを作成できません。"
      : "未ログインだと、再参加ができません。";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-destructive/30">
        <DialogHeader>
          <DialogTitle className="pr-8 text-[15px] leading-6 font-bold text-destructive">
            {message}
          </DialogTitle>
        </DialogHeader>
        <LoginButton className="h-12 w-full text-base font-bold" isPending={isPending} size="lg" />
        {prompt === "joinRoom" ? (
          <Button asChild type="button" size="lg" className="h-12 w-full text-base font-bold">
            <Link to="/rooms/join">ルーム参加へ進む</Link>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export { LoginPromptDialog };
export type { LoginPrompt };
