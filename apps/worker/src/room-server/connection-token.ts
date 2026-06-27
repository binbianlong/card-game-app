import type { RoomState } from "schema";
import { validateConnectionToken, type ConnectionToken } from "./connection-event.ts";
import { RoomStateError } from "../rooms/state.ts";

const connectionTokenTtlMs = 60 * 60 * 1000;
const connectionTokensStorageKey = "connectionTokens";

async function setConnectionToken(storage: DurableObjectStorage, playerId: string) {
  const connectionTokens = await getConnectionTokens(storage);
  const connectionToken = {
    expiresAt: Date.now() + connectionTokenTtlMs,
    value: crypto.randomUUID(),
  };

  await storage.put(connectionTokensStorageKey, {
    ...connectionTokens,
    [playerId]: connectionToken,
  });

  return connectionToken.value;
}

async function getConnectionTokens(storage: DurableObjectStorage) {
  return (await storage.get<Record<string, ConnectionToken>>(connectionTokensStorageKey)) ?? {};
}

async function validateStoredConnectionToken({
  playerId,
  requestToken,
  room,
  storage,
}: {
  playerId: string;
  requestToken: string | null;
  room: RoomState;
  storage: DurableObjectStorage;
}) {
  if (room.status === "finished" && room.game === null) {
    return new RoomStateError("notAllowed", "Room has ended.");
  }

  const connectionTokens = await getConnectionTokens(storage);

  return validateConnectionToken({
    expectedConnectionToken: connectionTokens[playerId],
    hasParticipant: room.participants.some((participant) => participant.id === playerId),
    now: Date.now(),
    requestConnectionToken: requestToken,
  });
}

export { setConnectionToken, validateStoredConnectionToken };
