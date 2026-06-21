import { useCallback, useEffect, useState } from "react";
import type { RoomHistoryResponse, RoomMatchHistoryResponse } from "schema";
import { getRoomHistory, getRoomMatchHistory } from "@/features/rooms/room-api";

type LoadStatus = "error" | "idle" | "loading" | "success";

function useRoomHistory(enabled: boolean) {
  const loadHistory = useCallback(() => getRoomHistory(), []);

  return useHistoryQuery<RoomHistoryResponse>({ enabled, load: loadHistory });
}

function useRoomMatchHistory({ enabled, roomId }: { enabled: boolean; roomId: string }) {
  const loadHistory = useCallback(() => getRoomMatchHistory(roomId), [roomId]);

  return useHistoryQuery<RoomMatchHistoryResponse>({ enabled, load: loadHistory });
}

function useHistoryQuery<T>({ enabled, load }: { enabled: boolean; load: () => Promise<T> }) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let ignore = false;
    setStatus("loading");

    void load()
      .then((nextData) => {
        if (!ignore) {
          setData(nextData);
          setStatus("success");
        }
      })
      .catch(() => {
        if (!ignore) {
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [enabled, load]);

  return { data, status };
}

export { useRoomHistory, useRoomMatchHistory };
export type { LoadStatus };
