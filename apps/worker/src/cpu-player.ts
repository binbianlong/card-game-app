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

  const cardCount = state.table.play?.cards.length ?? 1;

  for (const cardIds of createCardIdCombinations(
    player.hand.map((card) => card.id),
    cardCount,
  )) {
    if (getAvailableActions(state, playerId, { selectedCardIds: cardIds }).canPlaySelectedCards) {
      return cardIds;
    }
  }

  return null;
}

function createCardIdCombinations(
  cardIds: readonly string[],
  count: number,
): readonly (readonly string[])[] {
  if (count <= 0 || count > cardIds.length) {
    return [];
  }

  const combinations: string[][] = [];

  function collect(startIndex: number, currentCardIds: string[]) {
    if (currentCardIds.length === count) {
      combinations.push([...currentCardIds]);
      return;
    }

    for (let index = startIndex; index < cardIds.length; index += 1) {
      currentCardIds.push(cardIds[index]);
      collect(index + 1, currentCardIds);
      currentCardIds.pop();
    }
  }

  collect(0, []);

  return combinations;
}

export { applyNextCpuTurn, isCpuTurn };
