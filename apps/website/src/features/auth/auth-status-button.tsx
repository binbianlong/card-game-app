import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "./auth-client";

function AuthStatusButton() {
  const session = authClient.useSession();
  const userName = session.data?.user.name ?? null;

  if (session.isPending) {
    return (
      <Button variant="ghost" size="sm" disabled>
        確認中
      </Button>
    );
  }

  if (userName !== null) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="max-w-[160px]"
        onClick={() => {
          void authClient.signOut();
        }}
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="truncate">{userName}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        void authClient.signIn.social({
          provider: "google",
        });
      }}
    >
      <LogIn className="size-4" aria-hidden="true" />
      ログイン
    </Button>
  );
}

export { AuthStatusButton };
