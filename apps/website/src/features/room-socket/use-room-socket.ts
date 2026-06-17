import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { ServerEventSchema, roomPartyName, type ClientEvent, type RoomClientState } from "schema";
import {
  createRoomConnectionTicket,
  getWorkerHost,
  RoomConnectionTicketError,
} from "@/features/rooms/room-api";

type ConnectionStatus = "closed" | "connecting" | "open";

const policyViolationCloseCode = 1008;

type RoomSocketOptions = {
  connectionToken: string;
  onClose: (event: CloseEvent) => void;
  onError: () => void;
  onMessage: (event: MessageEvent) => void;
  onOpen: () => void;
  onReconnectRequired: () => void;
  playerId: string;
  roomId: string;
};

function useRoomSocket({
  connectionToken,
  invalidMessage,
  playerId,
  roomId,
}: {
  connectionToken: string;
  invalidMessage: string;
  playerId: string;
  roomId: string;
}) {
  const socketRef = useRef<PartySocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("closed");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReconnectRequired, setIsReconnectRequired] = useState(false);
  const [room, setRoom] = useState<RoomClientState | null>(null);

  useEffect(() => {
    if (roomId.length === 0 || playerId.length === 0 || connectionToken.length === 0) {
      setErrorMessage("ルーム情報がありません。");
      return;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);
    setIsReconnectRequired(false);

    const socket = createRoomSocket({
      connectionToken,
      onClose: (event) => {
        setConnectionStatus("closed");

        if (event.code === policyViolationCloseCode) {
          setIsReconnectRequired(true);
        }
      },
      onError: () => {
        setConnectionStatus("closed");
        setErrorMessage("リアルタイム接続に失敗しました。");
      },
      onMessage: (event) => {
        const serverEvent = ServerEventSchema.safeParse(parseMessage(event.data));

        if (!serverEvent.success) {
          setErrorMessage(invalidMessage);
          return;
        }

        if (serverEvent.data.type === "error") {
          setErrorMessage(serverEvent.data.message);
          return;
        }

        setRoom(serverEvent.data.room);
        setErrorMessage(null);
      },
      onOpen: () => setConnectionStatus("open"),
      onReconnectRequired: () => setIsReconnectRequired(true),
      playerId,
      roomId,
    });
    socketRef.current = socket;

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [connectionToken, invalidMessage, playerId, roomId]);

  function sendEvent(event: ClientEvent) {
    socketRef.current?.send(JSON.stringify(event));
  }

  return { connectionStatus, errorMessage, isReconnectRequired, room, sendEvent };
}

function createRoomSocket({
  connectionToken,
  onClose,
  onError,
  onMessage,
  onOpen,
  onReconnectRequired,
  playerId,
  roomId,
}: RoomSocketOptions) {
  const socket = new PartySocket({
    host: getWorkerHost(),
    party: roomPartyName,
    query: async () => {
      try {
        return {
          ticket: await createRoomConnectionTicket({ connectionToken, playerId, roomId }),
        };
      } catch (error) {
        if (isConnectionRejected(error)) {
          onReconnectRequired();
          socket.close(policyViolationCloseCode, "Connection rejected.");
        }

        throw error;
      }
    },
    room: roomId,
    id: playerId,
    startClosed: true,
  });

  socket.addEventListener("open", onOpen);
  socket.addEventListener("close", (event) => {
    onClose(event);

    if (event.code === policyViolationCloseCode) {
      socket.close(event.code, event.reason);
    }
  });
  socket.addEventListener("error", onError);
  socket.addEventListener("message", onMessage);
  socket.reconnect();

  return socket;
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

function isConnectionRejected(error: unknown) {
  return error instanceof RoomConnectionTicketError && error.status === 403;
}

export { createRoomSocket, useRoomSocket };
export type { ConnectionStatus };
