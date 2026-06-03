import type { ClientEvent } from "schema";
import { RoomStateError } from "../rooms/state.ts";

function validateConnectionEvent(connectionId: string, event: ClientEvent) {
  if (!("playerId" in event)) {
    return new RoomStateError("notAllowed", "WebSocket events must include a player.");
  }

  if (event.playerId !== connectionId) {
    return new RoomStateError("notAllowed", "Player does not match the connection.");
  }

  return null;
}

export { validateConnectionEvent };
