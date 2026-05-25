import { applyGameAction, createNewGame, type PlayerId } from "game";
import { GameStateSchema, type ClientEvent, type RoomState } from "schema";
import { RoomStateError } from "./room-errors.ts";

function startGame(room: RoomState, event: Extract<ClientEvent, { type: "startGame" }>): RoomState {
  assertCanStartGame(room, event.playerId);

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

  if (room.participants.some((participant) => participant.kind !== "cpu" && !participant.ready)) {
    throw new RoomStateError("notAllowed", "All players must be ready before starting.");
  }
}

function applyGameRoomAction(
  room: RoomState,
  event: Extract<ClientEvent, { type: "playCards" | "pass" }>,
): RoomState {
  if (room.status !== "playing" || room.game === null) {
    throw new RoomStateError("notAllowed", "Game is not playing.");
  }

  const game = GameStateSchema.parse(applyGameAction(room.game, event));

  return {
    ...room,
    status: game.phase,
    game,
  };
}

export { applyGameRoomAction, startGame };
