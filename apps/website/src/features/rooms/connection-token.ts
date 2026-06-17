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

function createRoomConnectionTokenKey(roomId: string, playerId: string) {
  return `room-connection-token:${roomId}:${playerId}`;
}

export { getRoomConnectionToken, saveRoomConnectionToken };
