import type { ClientEvent, GameRuleSettings, RoomParticipant, RoomState } from "schema";

const defaultRules: GameRuleSettings = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  sequence: true,
  suitLock: true,
};

function createWaitingRoom(
  event: Extract<ClientEvent, { type: "createRoom" }>,
  roomId: string,
  inviteCode: string,
): RoomState {
  const host: RoomParticipant = {
    id: "player-1",
    name: createPlayerName(event.playerName, []),
    kind: "host",
    connected: true,
    ready: false,
  };
  const cpuParticipants = Array.from(
    { length: event.cpuCount },
    (_, index): RoomParticipant => ({
      id: `cpu-${index + 1}`,
      name: `CPU ${index + 1}`,
      kind: "cpu",
      connected: true,
      ready: true,
    }),
  );

  return {
    id: roomId,
    inviteCode,
    playerCount: event.playerCount,
    status: "waiting",
    hostPlayerId: host.id,
    participants: [host, ...cpuParticipants],
    rules: event.rules,
    game: null,
  };
}

function createFallbackRoom(roomId: string): RoomState {
  return {
    id: roomId,
    inviteCode: createInviteCode(roomId),
    playerCount: 4,
    status: "waiting",
    hostPlayerId: "player-1",
    participants: [
      {
        id: "player-1",
        name: "プレイヤー1",
        kind: "host",
        connected: true,
        ready: false,
      },
    ],
    rules: defaultRules,
    game: null,
  };
}

function createInviteCode(roomId: string) {
  return roomId.replaceAll("-", "").slice(0, 4).toUpperCase();
}

function createPlayerId(participants: readonly RoomParticipant[]) {
  return `player-${participants.length + 1}`;
}

function createPlayerName(playerName: string, participants: readonly RoomParticipant[]) {
  const normalizedName = playerName.trim();

  if (normalizedName.length > 0) {
    return normalizedName;
  }

  const humanPlayerCount = participants.filter((participant) => participant.kind !== "cpu").length;

  return `プレイヤー${humanPlayerCount + 1}`;
}

export {
  createFallbackRoom,
  createInviteCode,
  createPlayerId,
  createPlayerName,
  createWaitingRoom,
};
