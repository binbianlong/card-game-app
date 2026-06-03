const internalRoomServerSecretHeader = "x-room-server-secret";

type InternalRoomRequestOptions = {
  body: string;
  method: "POST" | "PUT";
  path: "/join" | "/state";
  secret: string;
};

type InternalRoomRequestValidation =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

function createInternalRoomRequest({ body, method, path, secret }: InternalRoomRequestOptions) {
  return new Request(`https://room-server.internal${path}`, {
    body,
    headers: {
      "content-type": "application/json",
      [internalRoomServerSecretHeader]: secret,
    },
    method,
  });
}

function validateInternalRoomRequest(
  request: Request,
  secret: string | undefined,
): InternalRoomRequestValidation {
  if (secret === undefined || secret.length === 0) {
    return {
      message: "Room server secret is not configured.",
      ok: false,
    };
  }

  if (request.headers.get(internalRoomServerSecretHeader) !== secret) {
    return {
      message: "Forbidden.",
      ok: false,
    };
  }

  return { ok: true };
}

export { createInternalRoomRequest, validateInternalRoomRequest };
