import {
  applyGameAction,
  createNewGame,
  getAvailableActions,
  GameRuleError,
  type GameAction,
  type GameState,
  type PlayerId,
} from "game";
import {
  GameStateSchema,
  clientEventTypes,
  type ClientEvent,
  type GameRuleSettings,
  type RoomParticipant,
  type RoomState,
} from "schema";

const defaultRules: GameRuleSettings = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  sequence: true,
  suitLock: true,
};

class RoomStateError extends Error {
  code: "gameRuleError" | "notAllowed" | "roomFull";

  constructor(code: RoomStateError["code"], message: string) {
    super(message);
    this.name = "RoomStateError";
    this.code = code;
  }
}

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

function createWaitingRoom(
  event: Extract<ClientEvent, { type: "createRoom" }>,
  roomId: string,
  inviteCode: string,
): RoomState {
  const host: RoomParticipant = {
    id: "player-1",
    name: event.playerName,
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
    status: "waiting",
    hostPlayerId: "player-1",
    participants: [
      {
        id: "player-1",
        name: "Host",
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

function startGame(room: RoomState): RoomState {
  assertWaitingRoom(room);

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

export {
  RoomStateError,
  applyNextCpuTurn,
  applyRoomClientEvent,
  createFallbackRoom,
  createInviteCode,
  createPlayerId,
  createWaitingRoom,
  isCpuTurn,
};
