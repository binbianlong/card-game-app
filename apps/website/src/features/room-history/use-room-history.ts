import { useCallback, useEffect, useState } from "react";
import type { RoomHistoryResponse, RoomMatchHistoryResponse } from "schema";
import { getRoomHistory, getRoomMatchHistory } from "@/features/rooms/room-api";

type LoadStatus = "error" | "idle" | "loading" | "success";
type HistoryQueryState<T> =
  | { data: null; status: Exclude<LoadStatus, "success"> }
  | { data: T; status: "success" };

type StoredHistoryQueryState<T> = HistoryQueryState<T> & {
  load: (() => Promise<T>) | null;
};

const idleHistoryQueryState = { data: null, status: "idle" } as const;
const loadingHistoryQueryState = { data: null, status: "loading" } as const;

function useRoomHistory(enabled: boolean) {
  const loadHistory = useCallback(() => getRoomHistory(), []);

  return useHistoryQuery<RoomHistoryResponse>({ enabled, load: loadHistory });
}

function useRoomMatchHistory({ enabled, roomId }: { enabled: boolean; roomId: string }) {
  const loadHistory = useCallback(() => getRoomMatchHistory(roomId), [roomId]);

  return useHistoryQuery<RoomMatchHistoryResponse>({ enabled, load: loadHistory });
}

function useHistoryQuery<T>({ enabled, load }: { enabled: boolean; load: () => Promise<T> }) {
  const [state, setState] = useState<StoredHistoryQueryState<T>>({
    ...idleHistoryQueryState,
    load: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ ...idleHistoryQueryState, load: null });
      return;
    }

    let ignore = false;
    setState({ ...loadingHistoryQueryState, load });

    void load()
      .then((nextData) => {
        if (!ignore) {
          setState({ data: nextData, status: "success", load });
        }
      })
      .catch(() => {
        if (!ignore) {
          setState({ data: null, status: "error", load });
        }
      });

    return () => {
      ignore = true;
    };
  }, [enabled, load]);

  if (!enabled) {
    return idleHistoryQueryState;
  }

  if (state.load !== load) {
    return loadingHistoryQueryState;
  }

  return { data: state.data, status: state.status } as HistoryQueryState<T>;
}

export { useRoomHistory, useRoomMatchHistory };
export type { HistoryQueryState, LoadStatus };
