import { authClient } from "./auth-client";

function useAuthStatus() {
  const session = authClient.useSession();
  const hasSession = session.data !== null && session.data !== undefined;

  return {
    isLoggedIn: hasSession,
    isLoggedOut: !session.isPending && !hasSession,
    isPending: session.isPending,
  };
}

export { useAuthStatus };
