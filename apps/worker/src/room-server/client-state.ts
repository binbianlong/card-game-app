import { getPlayerView } from "game";
import { RoomClientStateSchema, type RoomClientState, type RoomState } from "schema";

function createRoomClientState(room: RoomState, viewerId: string): RoomClientState {
  const gameView =
    room.game === null
      ? null
      : {
          ...getPlayerView(room.game, viewerId),
          ...(room.game.phase === "finished"
            ? {
                initialHands: room.game.initialHands,
                players: room.game.players.map((player) => {
                  const rankingIndex = room.game?.rankings.indexOf(player.id) ?? -1;

                  return {
                    id: player.id,
                    connected: player.connected,
                    handCount: player.hand.length,
                    hand: player.hand,
                    finished: rankingIndex !== -1,
                    rank: rankingIndex === -1 ? null : rankingIndex + 1,
                  };
                }),
              }
            : {}),
        };

  return RoomClientStateSchema.parse({
    ...room,
    game: gameView,
  });
}

export { createRoomClientState };
