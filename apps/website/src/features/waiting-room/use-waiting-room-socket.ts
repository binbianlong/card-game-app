import { useRoomSocket, type ConnectionStatus } from "@/features/room-socket/use-room-socket";

function useWaitingRoomSocket({
  connectionToken,
  playerId,
  roomId,
}: {
  connectionToken: string;
  playerId: string;
  roomId: string;
}) {
  return useRoomSocket({
    connectionToken,
    invalidMessage: "ルーム状態を読み取れませんでした。",
    playerId,
    roomId,
  });
}

export { useWaitingRoomSocket };
export type { ConnectionStatus };
