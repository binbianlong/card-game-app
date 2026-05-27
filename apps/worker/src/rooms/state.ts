import { GameRuleError } from "game";
import { clientEventTypes, type ClientEvent, type RoomParticipant, type RoomState } from "schema";
import { applyGameRoomAction, startGame } from "./game.ts";
import { RoomStateError } from "./errors.ts";
import { createPlayerId, createPlayerName } from "./factory.ts";

function applyRoomClientEvent(room: RoomState, event: ClientEvent): RoomState {
  try {
    if (event.type === clientEventTypes.createRoom) {
      return room;
    }

    assertRoomEventTarget(room, event.roomId);

    switch (event.type) {
      case clientEventTypes.joinRoom:
        return joinRoom(room, event.playerName);
      case clientEventTypes.leaveRoom:
        return updateParticipant(room, event.playerId, { connected: false, ready: false });
      case clientEventTypes.setReady:
        return updateParticipant(room, event.playerId, { ready: event.ready });
      case clientEventTypes.updateRules:
        assertWaitingRoom(room);
        assertHost(room, event.playerId);
        return { ...room, rules: event.rules };
      case clientEventTypes.startGame:
        return startGame(room, event);
      case clientEventTypes.playCards:
        return applyGameRoomAction(room, event);
      case clientEventTypes.pass:
        return applyGameRoomAction(room, event);
    }
  } catch (error) {
    if (error instanceof RoomStateError) {
      throw error;
    }

    if (error instanceof GameRuleError) {
      throw new RoomStateError("gameRuleError", error.message);
    }

    throw error;
  }
}

function joinRoom(room: RoomState, playerName: string): RoomState {
  assertWaitingRoom(room);

  if (room.participants.length >= room.playerCount) {
    throw new RoomStateError("roomFull", "Room is full.");
  }

  const participant: RoomParticipant = {
    id: createPlayerId(room.participants),
    name: createPlayerName(playerName, room.participants),
    kind: "guest",
    connected: true,
    ready: false,
  };

  return {
    ...room,
    participants: [...room.participants, participant],
  };
}

function updateParticipant(
  room: RoomState,
  playerId: string,
  patch: Partial<Pick<RoomParticipant, "connected" | "ready">>,
): RoomState {
  assertParticipantExists(room, playerId);

  return {
    ...room,
    participants: room.participants.map((participant) =>
      participant.id === playerId ? { ...participant, ...patch } : participant,
    ),
  };
}

function assertWaitingRoom(room: RoomState) {
  if (room.status !== "waiting") {
    throw new RoomStateError("notAllowed", "Room is not waiting.");
  }
}

function assertRoomEventTarget(room: RoomState, roomId: string) {
  if (roomId !== room.id && roomId !== room.inviteCode) {
    throw new RoomStateError("notAllowed", "Event targets a different room.");
  }
}

function assertParticipantExists(room: RoomState, playerId: string) {
  if (!room.participants.some((participant) => participant.id === playerId)) {
    throw new RoomStateError("notAllowed", "Player is not in this room.");
  }
}

function assertHost(room: RoomState, playerId: string) {
  assertParticipantExists(room, playerId);

  if (playerId !== room.hostPlayerId) {
    throw new RoomStateError("notAllowed", "Only the host can perform this action.");
  }
}

export { RoomStateError, applyRoomClientEvent };
export { applyNextCpuTurn, isCpuTurn } from "./cpu-player.ts";
export {
  createFallbackRoom,
  createInviteCode,
  createPlayerId,
  createWaitingRoom,
} from "./factory.ts";
