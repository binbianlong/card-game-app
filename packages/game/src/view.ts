import {
  GameRuleError,
  type GameState,
  type PlayerGameView,
  type PlayerId,
  type PlayerViewState,
} from "./types.ts";

export function getPlayerView(state: GameState, viewerId: PlayerId): PlayerGameView {
  assertPlayerExists(state, viewerId);

  return {
    phase: state.phase,
    rules: state.rules,
    viewerId,
    players: state.players.map((player): PlayerViewState => {
      const rankingIndex = state.rankings.indexOf(player.id);

      return {
        id: player.id,
        connected: player.connected,
        handCount: player.hand.length,
        hand: player.id === viewerId ? player.hand : null,
        finished: rankingIndex !== -1,
        rank: rankingIndex === -1 ? null : rankingIndex + 1,
      };
    }),
    turnPlayerId: state.turnPlayerId,
    table: state.table,
    passedPlayerIds: state.passedPlayerIds,
    revolution: state.revolution,
    suitLock: state.suitLock,
    rankings: state.rankings,
  };
}

function assertPlayerExists(state: GameState, playerId: PlayerId): void {
  if (!state.players.some((player) => player.id === playerId)) {
    throw new GameRuleError("Player does not exist.");
  }
}
