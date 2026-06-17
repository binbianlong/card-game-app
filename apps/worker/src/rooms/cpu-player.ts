import {
  applyGameAction,
  getAvailableActions,
  type GameAction,
  type GameState,
  type PlayerId,
} from "game";
import { GameStateSchema, clientEventTypes, type RoomState } from "schema";

function applyNextCpuTurn(room: RoomState): RoomState {
  if (!isCpuTurn(room) || room.game === null) {
    return room;
  }

  const action = createCpuAction(room.game, room.game.turnPlayerId);

  if (action === null) {
    return room;
  }

  const game = GameStateSchema.parse(applyGameAction(room.game, action));

  return {
    ...room,
    status: game.phase,
    game,
  };
}

function isCpuTurn(room: RoomState) {
  if (room.status !== "playing" || room.game === null || room.game.phase !== "playing") {
    return false;
  }

  const participant = room.participants.find(
    (candidate) => candidate.id === room.game?.turnPlayerId,
  );

  return participant?.kind === "cpu";
}

function createCpuAction(state: GameState, playerId: PlayerId): GameAction | null {
  const cardIds = findPlayableCardIds(state, playerId);

  if (cardIds !== null) {
    return {
      type: clientEventTypes.playCards,
      playerId,
      cardIds,
    };
  }

  if (getAvailableActions(state, playerId).canPass) {
    return {
      type: clientEventTypes.pass,
      playerId,
    };
  }

  return null;
}

function findPlayableCardIds(state: GameState, playerId: PlayerId): readonly string[] | null {
  const player = state.players.find((candidate) => candidate.id === playerId);

  if (player === undefined) {
    return null;
  }

  if (state.table.play === null) {
    return findOpeningCardIds(state, playerId);
  }

  const cardCount = state.table.play?.cards.length ?? 1;

  for (const cardIds of iterateCardIdCombinations(
    player.hand.map((card) => card.id),
    cardCount,
  )) {
    if (getAvailableActions(state, playerId, { selectedCardIds: cardIds }).canPlaySelectedCards) {
      return cardIds;
    }
  }

  return null;
}

function findOpeningCardIds(state: GameState, playerId: PlayerId): readonly string[] | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const weakestCard = player?.hand[0];

  if (player === undefined || weakestCard === undefined) {
    return null;
  }

  const weakestCardIds = player.hand
    .filter((card) => card.rank === weakestCard.rank)
    .map((card) => card.id);

  if (
    weakestCardIds.length >= 2 &&
    getAvailableActions(state, playerId, { selectedCardIds: weakestCardIds }).canPlaySelectedCards
  ) {
    return weakestCardIds;
  }

  return [weakestCard.id];
}

function* iterateCardIdCombinations(
  cardIds: readonly string[],
  count: number,
): Generator<readonly string[]> {
  if (count <= 0 || count > cardIds.length) {
    return;
  }

  function* collect(startIndex: number, currentCardIds: string[]): Generator<readonly string[]> {
    if (currentCardIds.length === count) {
      yield [...currentCardIds];
      return;
    }

    for (let index = startIndex; index < cardIds.length; index += 1) {
      currentCardIds.push(cardIds[index]);
      yield* collect(index + 1, currentCardIds);
      currentCardIds.pop();
    }
  }

  yield* collect(0, []);
}

export { applyNextCpuTurn, isCpuTurn };
