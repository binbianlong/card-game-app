function saveRoomConnectionToken({
  connectionToken,
  playerId,
  roomId,
}: {
  connectionToken: string;
  playerId: string;
  roomId: string;
}) {
  window.sessionStorage.setItem(createRoomConnectionTokenKey(roomId, playerId), connectionToken);
}

function getRoomConnectionToken({ playerId, roomId }: { playerId: string; roomId: string }) {
  return window.sessionStorage.getItem(createRoomConnectionTokenKey(roomId, playerId)) ?? "";
}

function resolveRoomConnection({
  playerId: optionalPlayerId,
  roomId: optionalRoomId,
}: {
  playerId: string | undefined;
  roomId: string | undefined;
}) {
  const playerId = optionalPlayerId ?? "";
  const roomId = optionalRoomId ?? "";
  const connectionToken =
    playerId.length === 0 || roomId.length === 0
      ? ""
      : getRoomConnectionToken({ playerId, roomId });

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

export { getRoomConnectionToken, resolveRoomConnection, saveRoomConnectionToken };
