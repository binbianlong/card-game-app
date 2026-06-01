import { createAuthClient } from "better-auth/react";
import { getWorkerOrigin } from "@/features/rooms/room-api";

const workerOrigin = getWorkerOrigin();

const authClient =
  workerOrigin === null
    ? createAuthClient()
    : createAuthClient({
        baseURL: workerOrigin,
        fetchOptions: {
          credentials: "include",
        },
      });

export { authClient };
