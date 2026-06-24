import { applyGameAction, createNewGame, type PlayerId } from "game";
import { GameStateSchema, type ClientEvent, type RoomState } from "schema";
import { RoomStateError } from "./errors.ts";

function startGame(room: RoomState, event: Extract<ClientEvent, { type: "startGame" }>): RoomState {
  assertCanStartGame(room, event.playerId);

  return createPlayingRoom(room);
}

function startRematch(
  room: RoomState,
  event: Extract<ClientEvent, { type: "rematch" }>,
): RoomState {
  assertCanStartRematch(room, event.playerId);

  return createPlayingRoom(room);
}

function createPlayingRoom(room: RoomState): RoomState {
  const game = GameStateSchema.parse(
    createNewGame(
      room.participants.map((participant) => participant.id as PlayerId),
      { rules: room.rules },
    ),
  );

  return {
    ...room,
    status: "playing",
    game,
  };
}

function assertCanStartGame(room: RoomState, playerId: string) {
  if (room.status !== "waiting") {
    throw new RoomStateError("notAllowed", "Room is not waiting.");
  }

  if (playerId !== room.hostPlayerId) {
    throw new RoomStateError("notAllowed", "Only the host can start the game.");
  }

  if (room.participants.length !== room.playerCount) {
    throw new RoomStateError("notAllowed", "Not enough players have joined.");
  }

  if (!areHumanParticipantsReady(room)) {
    throw new RoomStateError("notAllowed", "All players must be ready before starting.");
  }
}

function assertCanStartRematch(room: RoomState, playerId: string) {
  if (room.status !== "finished" || room.game?.phase !== "finished") {
    throw new RoomStateError("notAllowed", "Game is not finished.");
  }

  if (playerId !== room.hostPlayerId) {
    throw new RoomStateError("notAllowed", "Only the host can start a rematch.");
  }

  if (room.participants.length !== room.playerCount) {
    throw new RoomStateError("notAllowed", "Not enough players are in the room.");
  }

  if (!areHumanParticipantsReady(room)) {
    throw new RoomStateError("notAllowed", "All players must be ready before starting a rematch.");
  }
}

function areHumanParticipantsReady(room: RoomState) {
  return room.participants.every((participant) => participant.kind === "cpu" || participant.ready);
}

function applyGameRoomAction(
  room: RoomState,
  event: Extract<ClientEvent, { type: "playCards" | "pass" }>,
): RoomState {
  if (room.status !== "playing" || room.game === null) {
    throw new RoomStateError("notAllowed", "Game is not playing.");
  }

  const game = GameStateSchema.parse(applyGameAction(room.game, event));
  const participants =
    game.phase === "finished"
      ? room.participants.map((participant) => ({
          ...participant,
          ready: participant.kind === "cpu",
        }))
      : room.participants;

  return {
    ...room,
    status: game.phase,
    participants,
    game,
  };
}

export { applyGameRoomAction, startGame, startRematch };
