function saveRoomConnectionToken({
  cpuCount,
  connectionToken,
  isHost,
  playerId,
  playerCount,
  roomId,
}: {
  cpuCount: number;
  connectionToken: string;
  isHost: boolean;
  playerId: string;
  playerCount: number;
  roomId: string;
}) {
  const tokenKey = createRoomConnectionTokenKey(roomId, playerId);

  setStorageItem(window.sessionStorage, tokenKey, connectionToken);
  setStorageItem(window.localStorage, tokenKey, connectionToken);
  setStorageItem(
    window.localStorage,
    activeRoomConnectionStorageKey,
    JSON.stringify({
      cpuCount,
      isHost,
      playerCount,
      playerId,
      roomId,
    }),
  );
  setStorageItem(
    window.localStorage,
    roomConnectionsStorageKey,
    JSON.stringify(
      upsertRoomConnection(getRoomConnections(), {
        cpuCount,
        isHost,
        playerCount,
        playerId,
        roomId,
      }),
    ),
  );
}

function getRoomConnectionToken({ playerId, roomId }: { playerId: string; roomId: string }) {
  const tokenKey = createRoomConnectionTokenKey(roomId, playerId);

  return (
    getStorageItem(window.sessionStorage, tokenKey) ??
    getStorageItem(window.localStorage, tokenKey) ??
    ""
  );
}

function getActiveRoomConnection() {
  return getRoomConnections()[0] ?? null;
}

function activateRoomConnection({ playerId, roomId }: { playerId: string; roomId: string }) {
  const connection = getRoomConnections().find(
    (candidate) => candidate.roomId === roomId && candidate.playerId === playerId,
  );

  if (connection === undefined) {
    return;
  }

  setStorageItem(window.localStorage, activeRoomConnectionStorageKey, JSON.stringify(connection));
  setStorageItem(
    window.localStorage,
    roomConnectionsStorageKey,
    JSON.stringify(upsertRoomConnection(getRoomConnections(), connection)),
  );
}

function getRoomConnections() {
  const value = getStorageItem(window.localStorage, roomConnectionsStorageKey);
  const connections = value === null ? [] : parseRoomConnections(value);
  const legacyConnection = getLegacyActiveRoomConnection();

  if (legacyConnection === null) {
    return connections;
  }

  return upsertRoomConnection(connections, legacyConnection);
}

function getLegacyActiveRoomConnection() {
  const value = getStorageItem(window.localStorage, activeRoomConnectionStorageKey);

  if (value === null) {
    return null;
  }

  return parseRoomConnection(value);
}

function removeRoomConnection({ playerId, roomId }: { playerId: string; roomId: string }) {
  const tokenKey = createRoomConnectionTokenKey(roomId, playerId);
  const activeRoomConnection = getActiveRoomConnection();

  removeStorageItem(window.sessionStorage, tokenKey);
  removeStorageItem(window.localStorage, tokenKey);

  if (activeRoomConnection?.roomId === roomId && activeRoomConnection.playerId === playerId) {
    removeStorageItem(window.localStorage, activeRoomConnectionStorageKey);
  }

  setStorageItem(
    window.localStorage,
    roomConnectionsStorageKey,
    JSON.stringify(
      getRoomConnections().filter(
        (connection) => connection.roomId !== roomId || connection.playerId !== playerId,
      ),
    ),
  );
}

function resolveRoomConnection({ roomId: optionalRoomId }: { roomId: string | undefined }) {
  const roomId = optionalRoomId ?? "";
  const connection =
    roomId.length === 0
      ? null
      : (getRoomConnections().find((candidate) => candidate.roomId === roomId) ?? null);
  const playerId = connection?.playerId ?? "";
  const connectionToken =
    connection === null ? "" : getRoomConnectionToken({ playerId: connection.playerId, roomId });

  return {
    connectionToken,
    hasConnectionToken: connectionToken.length > 0,
    playerId,
    roomId,
  };
}

function createRoomConnectionTokenKey(roomId: string, playerId: string) {
  return `room-connection-token:${roomId}:${playerId}`;
}

function parseRoomConnections(value: string) {
  try {
    const data = JSON.parse(value) as unknown;

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((connection) => parseRoomConnectionData(connection))
      .filter((connection) => connection !== null);
  } catch {
    return [];
  }
}

function parseRoomConnection(value: string) {
  try {
    const data = JSON.parse(value) as unknown;

    return parseRoomConnectionData(data);
  } catch {
    return null;
  }
}

function parseRoomConnectionData(data: unknown) {
  if (
    typeof data !== "object" ||
    data === null ||
    !("cpuCount" in data) ||
    !("playerCount" in data) ||
    !("playerId" in data) ||
    !("roomId" in data)
  ) {
    return null;
  }

  if (
    typeof data.cpuCount !== "number" ||
    typeof data.playerCount !== "number" ||
    typeof data.playerId !== "string" ||
    typeof data.roomId !== "string"
  ) {
    return null;
  }

  if (
    !Number.isInteger(data.cpuCount) ||
    !Number.isInteger(data.playerCount) ||
    data.cpuCount < 0 ||
    data.playerCount < 3 ||
    data.playerCount > 6 ||
    data.cpuCount >= data.playerCount ||
    data.playerId.length === 0 ||
    data.roomId.length === 0
  ) {
    return null;
  }

  return {
    cpuCount: data.cpuCount,
    isHost: "isHost" in data && typeof data.isHost === "boolean" ? data.isHost : false,
    playerCount: data.playerCount,
    playerId: data.playerId,
    roomId: data.roomId,
  };
}

function upsertRoomConnection(
  connections: readonly RoomConnectionMetadata[],
  nextConnection: RoomConnectionMetadata,
) {
  return [
    nextConnection,
    ...connections.filter(
      (connection) =>
        connection.roomId !== nextConnection.roomId ||
        connection.playerId !== nextConnection.playerId,
    ),
  ];
}

function getStorageItem(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // The in-memory session still works even if persistent storage is blocked.
  }
}

function removeStorageItem(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

const activeRoomConnectionStorageKey = "room-connection-active";
const roomConnectionsStorageKey = "room-connections";

type RoomConnectionMetadata = {
  cpuCount: number;
  isHost: boolean;
  playerCount: number;
  playerId: string;
  roomId: string;
};

export {
  activateRoomConnection,
  getActiveRoomConnection,
  getRoomConnectionToken,
  getRoomConnections,
  removeRoomConnection,
  resolveRoomConnection,
  saveRoomConnectionToken,
};
export type { RoomConnectionMetadata };
