import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { getWorkerHost } from "@/features/rooms/room-api";
import { ServerEventSchema, roomPartyName, type ClientEvent, type RoomState } from "schema";

type ConnectionStatus = "closed" | "connecting" | "open";

function useWaitingRoomSocket({ playerId, roomId }: { playerId: string; roomId: string }) {
  const socketRef = useRef<PartySocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("closed");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);

  useEffect(() => {
    if (roomId.length === 0 || playerId.length === 0) {
      setErrorMessage("ルーム情報がありません。");
      return;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);

    const socket = new PartySocket({
      host: getWorkerHost(),
      party: roomPartyName,
      room: roomId,
      id: playerId,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => setConnectionStatus("open"));
    socket.addEventListener("close", () => setConnectionStatus("closed"));
    socket.addEventListener("error", () => {
      setConnectionStatus("closed");
      setErrorMessage("リアルタイム接続に失敗しました。");
    });
    socket.addEventListener("message", (event) => {
      const serverEvent = ServerEventSchema.safeParse(parseMessage(event.data));

      if (!serverEvent.success) {
        setErrorMessage("ルーム状態を読み取れませんでした。");
        return;
      }

      if (serverEvent.data.type === "error") {
        setErrorMessage(serverEvent.data.message);
        return;
      }

      setRoom(serverEvent.data.room);
      setErrorMessage(null);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [playerId, roomId]);

  function sendEvent(event: ClientEvent) {
    socketRef.current?.send(JSON.stringify(event));
  }

  return { connectionStatus, errorMessage, room, sendEvent };
}

function parseMessage(message: unknown) {
  if (typeof message !== "string") {
    return null;
  }

  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
}

export { useWaitingRoomSocket };
export type { ConnectionStatus };
