import { applyGameAction, createNewGame, type PlayerId } from "game";
import { GameStateSchema, type ClientEvent, type RoomState } from "schema";
import { RoomStateError } from "./room-errors.ts";

function startGame(room: RoomState): RoomState {
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
