import type { ClientEvent } from "schema";
import { RoomStateError } from "../rooms/state.ts";

type ConnectionTokenValidationOptions = {
  expectedConnectionToken: ConnectionToken | undefined;
  hasParticipant: boolean;
  now: number;
  requestConnectionToken: string | null;
};

type ConnectionToken = {
  expiresAt: number;
  value: string;
};

function validateConnectionEvent(connectionId: string, event: ClientEvent) {
  if (!("playerId" in event)) {
    return new RoomStateError("notAllowed", "WebSocket events must include a player.");
  }

  if (event.playerId !== connectionId) {
    return new RoomStateError("notAllowed", "Player does not match the connection.");
  }

  return null;
}

function validateConnectionToken({
  expectedConnectionToken,
  hasParticipant,
  now,
  requestConnectionToken,
}: ConnectionTokenValidationOptions) {
  if (!hasParticipant) {
    return new RoomStateError("notAllowed", "Player is not in this room.");
  }

  if (requestConnectionToken === null || requestConnectionToken.length === 0) {
    return new RoomStateError("notAllowed", "Connection token is required.");
  }

  if (
    expectedConnectionToken === undefined ||
    expectedConnectionToken.value !== requestConnectionToken
  ) {
    return new RoomStateError("notAllowed", "Connection token is invalid.");
  }

  if (expectedConnectionToken.expiresAt <= now) {
    return new RoomStateError("notAllowed", "Connection token has expired.");
  }

  return null;
}

export { validateConnectionEvent, validateConnectionToken };
export type { ConnectionToken };
