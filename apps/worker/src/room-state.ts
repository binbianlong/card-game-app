import { GameRuleError } from "game";
import { clientEventTypes, type ClientEvent, type RoomParticipant, type RoomState } from "schema";
import { applyGameRoomAction, startGame } from "./room-game.ts";
import { RoomStateError } from "./room-errors.ts";
import { createPlayerId } from "./room-factory.ts";

function applyRoomClientEvent(room: RoomState, event: ClientEvent): RoomState {
  try {
    if (event.type === clientEventTypes.createRoom) {
      return room;
    }

    switch (event.type) {
      case clientEventTypes.joinRoom:
        return joinRoom(room, event.playerName);
      case clientEventTypes.leaveRoom:
        return updateParticipant(room, event.playerId, { connected: false, ready: false });
      case clientEventTypes.setReady:
        return updateParticipant(room, event.playerId, { ready: event.ready });
      case clientEventTypes.updateRules:
        assertWaitingRoom(room);
        return { ...room, rules: event.rules };
      case clientEventTypes.startGame:
        return startGame(room);
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

  const participant: RoomParticipant = {
    id: createPlayerId(room.participants),
    name: playerName,
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

function assertParticipantExists(room: RoomState, playerId: string) {
  if (!room.participants.some((participant) => participant.id === playerId)) {
    throw new RoomStateError("notAllowed", "Player is not in this room.");
  }
}

export { RoomStateError, applyRoomClientEvent };
export { applyNextCpuTurn, isCpuTurn } from "./cpu-player.ts";
export {
  createFallbackRoom,
  createInviteCode,
  createPlayerId,
  createWaitingRoom,
} from "./room-factory.ts";
