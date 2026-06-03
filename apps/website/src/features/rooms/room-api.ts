import {
  CreateRoomResponseSchema,
  JoinRoomResponseSchema,
  RoomHistoryResponseSchema,
  RoomMatchHistoryResponseSchema,
  createClientEvent,
  type GameRuleSettings,
} from "schema";
import { hc } from "hono/client";
import type { RoomsRoute } from "../../../../worker/src/routes/rooms.ts";

type CreateRoomInput = {
  cpuCount: number;
  playerCount: number;
  playerName: string;
  rules: GameRuleSettings;
};

async function createRoom(input: CreateRoomInput) {
  const response = await createRoomsClient().index.$post(
    {
      json: createClientEvent.createRoom(input),
    },
    createRequestOptions(),
  );

  if (!response.ok) {
    throw new Error("Failed to create room.");
  }

  return CreateRoomResponseSchema.parse(await response.json());
}

async function joinRoom({ inviteCode, playerName }: { inviteCode: string; playerName: string }) {
  const roomId = normalizeInviteCode(inviteCode);
  const response = await createRoomsClient().join.$post(
    {
      json: createClientEvent.joinRoom({ roomId, playerName }),
    },
    createRequestOptions(),
  );

  if (!response.ok) {
    throw new Error("Failed to join room.");
  }

  return JoinRoomResponseSchema.parse(await response.json());
}

async function getRoomHistory() {
  const response = await createRoomsClient().history.$get(undefined, createRequestOptions());

  if (!response.ok) {
    throw new Error("Failed to load match history.");
  }

  return RoomHistoryResponseSchema.parse(await response.json());
}

async function getRoomMatchHistory(roomId: string) {
  const response = await createRoomsClient().history[":roomKey"].$get(
    {
      param: { roomKey: roomId },
    },
    createRequestOptions(),
  );

  if (!response.ok) {
    throw new Error("Failed to load match history.");
  }

  return RoomMatchHistoryResponseSchema.parse(await response.json());
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().replace(/\s|-/g, "").toUpperCase();
}

function createApiUrl(path: string) {
  const origin = getWorkerOrigin();

  return origin === null ? path : new URL(path, origin).toString();
}

function createRoomsClient() {
  return hc<RoomsRoute>(createApiUrl("/api/rooms"));
}

function createRequestOptions() {
  return {
    init: {
      credentials: "include" as const,
    },
  };
}

function getWorkerHost() {
  const origin = getWorkerOrigin();

  return origin === null ? window.location.host : origin;
}

function getWorkerOrigin() {
  const origin = import.meta.env.VITE_WORKER_ORIGIN as string | undefined;

  return origin === undefined || origin.length === 0 ? null : origin;
}

export {
  createRoom,
  getRoomHistory,
  getRoomMatchHistory,
  getWorkerHost,
  getWorkerOrigin,
  joinRoom,
};
