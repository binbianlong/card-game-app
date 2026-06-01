import {
  CreateRoomResponseSchema,
  JoinRoomResponseSchema,
  MatchHistoryResponseSchema,
  createClientEvent,
  type GameRuleSettings,
} from "schema";

type CreateRoomInput = {
  cpuCount: number;
  playerCount: number;
  playerName: string;
  rules: GameRuleSettings;
};

async function createRoom(input: CreateRoomInput) {
  const response = await fetch(createApiUrl("/api/rooms"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(createClientEvent.createRoom(input)),
  });

  if (!response.ok) {
    throw new Error("Failed to create room.");
  }

  return CreateRoomResponseSchema.parse(await response.json());
}

async function joinRoom({ inviteCode, playerName }: { inviteCode: string; playerName: string }) {
  const roomId = normalizeInviteCode(inviteCode);
  const response = await fetch(createApiUrl("/api/rooms/join"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(createClientEvent.joinRoom({ roomId, playerName })),
  });

  if (!response.ok) {
    throw new Error("Failed to join room.");
  }

  return JoinRoomResponseSchema.parse(await response.json());
}

async function getMatchHistory() {
  const response = await fetch(createApiUrl("/api/rooms/history"), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load match history.");
  }

  return MatchHistoryResponseSchema.parse(await response.json());
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().replace(/\s|-/g, "").toUpperCase();
}

function createApiUrl(path: string) {
  const origin = getWorkerOrigin();

  return origin === null ? path : new URL(path, origin).toString();
}

function getWorkerHost() {
  const origin = getWorkerOrigin();

  return origin === null ? window.location.host : origin;
}

function getWorkerOrigin() {
  const origin = import.meta.env.VITE_WORKER_ORIGIN as string | undefined;

  return origin === undefined || origin.length === 0 ? null : origin;
}

export { createRoom, getMatchHistory, getWorkerHost, getWorkerOrigin, joinRoom };
