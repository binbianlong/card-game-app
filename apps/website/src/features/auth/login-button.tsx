import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "./auth-client";

type LoginButtonProps = {
  className?: string;
  isPending: boolean;
  size?: "sm" | "lg";
};

function LoginButton({ className, isPending, size = "sm" }: LoginButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      disabled={isPending}
      onClick={() => {
        void authClient.signIn.social({
          provider: "google",
        });
      }}
    >
      <LogIn className="size-4" aria-hidden="true" />
      {isPending ? "確認中" : "Googleでログイン"}
    </Button>
  );
}

export { LoginButton };
