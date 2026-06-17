import { describe, expect, test } from "vite-plus/test";
import { createGameState, getAvailableActions, type Card, type Rank, type Suit } from "game";
import { GameStateSchema, createClientEvent, type RoomState } from "schema";
import {
  RoomStateError,
  applyNextCpuTurn,
  applyRoomClientEvent,
  createInviteCode,
  createWaitingRoom,
  isCpuTurn,
} from "../src/rooms/state.ts";

const rules = {
  eightCut: false,
  elevenBack: false,
  revolution: false,
  sequence: false,
  suitLock: false,
};

describe("room state", () => {
  test("creates waiting rooms", () => {
    const room = createWaitingRoom(
      createClientEvent.createRoom({
        playerName: "Host",
        playerCount: 4,
        cpuCount: 1,
        rules,
      }),
      "room-1",
      createInviteCode("room-1"),
    );

    expect(room).toMatchObject({
      id: "room-1",
      inviteCode: "ROOM",
      status: "waiting",
      hostPlayerId: "player-1",
      game: null,
    });
    expect(room.participants).toHaveLength(2);
  });

  test("stores room participant changes in room state", () => {
    const room = createRoom();
    const joinedRoom = applyRoomClientEvent(
      room,
      createClientEvent.joinRoom({
        roomId: room.id,
        playerName: "Guest",
      }),
    );

    expect(joinedRoom.participants).toHaveLength(2);
    expect(joinedRoom.participants[1]).toMatchObject({
      id: "player-2",
      name: "Guest",
      kind: "guest",
      connected: true,
      ready: false,
    });
  });

  test("assigns default player names when names are empty", () => {
    const room = createWaitingRoom(
      createClientEvent.createRoom({
        playerName: "",
        playerCount: 4,
        cpuCount: 1,
        rules,
      }),
      "room-1",
      createInviteCode("room-1"),
    );
    const joinedRoom = applyRoomClientEvent(
      room,
      createClientEvent.joinRoom({
        roomId: room.id,
        playerName: "",
      }),
    );

    expect(room.participants[0]?.name).toBe("プレイヤー1");
    expect(joinedRoom.participants.at(-1)).toMatchObject({
      id: "player-3",
      name: "プレイヤー2",
    });
  });

  test("rejects joins when rooms are full", () => {
    const room = createPlayableRoom();

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.joinRoom({
          roomId: room.id,
          playerName: "Extra Guest",
        }),
      ),
    ).toThrow(RoomStateError);
  });

  test("starts games and stores game state in room state", () => {
    const room = readyAllHumanParticipants(createPlayableRoom());
    const playingRoom = applyRoomClientEvent(
      room,
      createClientEvent.startGame({
        roomId: room.id,
        playerId: room.hostPlayerId,
      }),
    );

    expect(playingRoom.status).toBe("playing");
    expect(playingRoom.game?.players).toHaveLength(3);
    expect(playingRoom.game?.players.every((player) => player.hand.length > 0)).toBe(true);
  });

  test("rejects local rule changes from non-host players", () => {
    const room = createPlayableRoom();

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.updateRules({
          roomId: room.id,
          playerId: "player-2",
          rules: {
            ...rules,
            eightCut: true,
          },
        }),
      ),
    ).toThrow(RoomStateError);
  });

  test("rejects events that target another room", () => {
    const room = createRoom();

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.setReady({
          roomId: "another-room",
          playerId: room.hostPlayerId,
          ready: true,
        }),
      ),
    ).toThrow(RoomStateError);
  });

  test("rejects game starts from non-host players", () => {
    const room = readyAllHumanParticipants(createPlayableRoom());

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.startGame({
          roomId: room.id,
          playerId: "player-2",
        }),
      ),
    ).toThrow(RoomStateError);
  });

  test("rejects game starts before all seats are filled", () => {
    const room = readyAllHumanParticipants(createRoom());

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.startGame({
          roomId: room.id,
          playerId: room.hostPlayerId,
        }),
      ),
    ).toThrow(RoomStateError);
  });

  test("rejects game starts before all human players are ready", () => {
    const room = createPlayableRoom();

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.startGame({
          roomId: room.id,
          playerId: room.hostPlayerId,
        }),
      ),
    ).toThrow(RoomStateError);
  });

  test("keeps cpu turns visible before the delayed server action", () => {
    const playingRoom = createCpuTurnRoom();
    const game = expectGame(playingRoom);

    expect(getParticipant(playingRoom, game.turnPlayerId).kind).toBe("cpu");
    expect(isCpuTurn(playingRoom)).toBe(true);
  });

  test("applies one delayed cpu turn", () => {
    const room = createCpuTurnRoom();
    const game = expectGame(room);
    const cpu = getParticipant(room, game.turnPlayerId);
    const nextGame = expectGame(applyNextCpuTurn(room));

    expect(nextGame).not.toEqual(game);
    expect(nextGame.table.playedBy === cpu.id || nextGame.passedPlayerIds.includes(cpu.id)).toBe(
      true,
    );
  });

  test("plays the weakest card before a stronger same-rank set on an opening cpu turn", () => {
    const room = createCpuOpeningRoom([
      card("3", "clubs"),
      card("5", "clubs"),
      card("5", "hearts"),
    ]);
    const nextGame = expectGame(applyNextCpuTurn(room));

    expect(nextGame.table.play).toMatchObject({
      kind: "single",
      rank: "3",
    });
    expect(nextGame.table.play?.cards.map((playedCard) => playedCard.id)).toEqual(["clubs-3"]);
  });

  test("plays same-rank weakest cards together on an opening cpu turn", () => {
    const room = createCpuOpeningRoom([
      card("3", "clubs"),
      card("3", "hearts"),
      card("5", "clubs"),
    ]);
    const nextGame = expectGame(applyNextCpuTurn(room));

    expect(nextGame.table.play).toMatchObject({
      kind: "set",
      count: 2,
      rank: "3",
    });
    expect(nextGame.table.play?.cards.map((playedCard) => playedCard.id)).toEqual([
      "clubs-3",
      "hearts-3",
    ]);
  });

  test("stores game actions in room state", () => {
    const room = applyRoomClientEvent(
      readyAllHumanParticipants(createPlayableRoom()),
      createClientEvent.startGame({
        roomId: "room-1",
        playerId: "player-1",
      }),
    );
    const game = expectGame(room);
    const player = game.players.find((candidate) => candidate.id === game.turnPlayerId);

    if (player === undefined) {
      throw new Error("Expected turn player.");
    }

    const card = player.hand[0];

    if (card === undefined) {
      throw new Error("Expected the turn player to have cards.");
    }

    const nextRoom = applyRoomClientEvent(
      room,
      createClientEvent.playCards({
        roomId: room.id,
        playerId: game.turnPlayerId,
        cardIds: [card.id],
      }),
    );
    const nextGame = expectGame(nextRoom);
    const nextPlayer = nextGame.players.find((candidate) => candidate.id === game.turnPlayerId);

    expect(nextPlayer?.hand).toHaveLength(player.hand.length - 1);
    expect(nextGame.table.play?.cards.map((playedCard) => playedCard.id)).toEqual([card.id]);
  });

  test("starts rematches with the same participants after games finish", () => {
    const finishedRoom = finishGame(
      applyRoomClientEvent(
        readyAllHumanParticipants(createPlayableRoom()),
        createClientEvent.startGame({
          roomId: "room-1",
          playerId: "player-1",
        }),
      ),
    );
    const rematchRoom = applyRoomClientEvent(
      finishedRoom,
      createClientEvent.rematch({
        roomId: finishedRoom.id,
        playerId: finishedRoom.hostPlayerId,
      }),
    );

    expect(finishedRoom.status).toBe("finished");
    expect(rematchRoom.status).toBe("playing");
    expect(rematchRoom.participants).toEqual(finishedRoom.participants);
    expect(rematchRoom.game?.phase).toBe("playing");
    expect(rematchRoom.game?.initialHands).toHaveLength(finishedRoom.participants.length);
  });

  test("rejects game actions before the game starts", () => {
    const room = createRoom();

    expect(() =>
      applyRoomClientEvent(
        room,
        createClientEvent.pass({
          roomId: room.id,
          playerId: room.hostPlayerId,
        }),
      ),
    ).toThrow(RoomStateError);
  });
});

function finishGame(room: RoomState) {
  let nextRoom = room;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (nextRoom.status === "finished") {
      return nextRoom;
    }

    const game = expectGame(nextRoom);
    const player = game.players.find((candidate) => candidate.id === game.turnPlayerId);
    const playableCard = player?.hand.find(
      (card) =>
        getAvailableActions(game, game.turnPlayerId, { selectedCardIds: [card.id] })
          .canPlaySelectedCards,
    );

    if (player === undefined) {
      throw new Error("Expected current player with cards.");
    }

    if (playableCard === undefined) {
      nextRoom = applyRoomClientEvent(
        nextRoom,
        createClientEvent.pass({
          roomId: nextRoom.id,
          playerId: player.id,
        }),
      );
    } else {
      nextRoom = applyRoomClientEvent(
        nextRoom,
        createClientEvent.playCards({
          roomId: nextRoom.id,
          playerId: player.id,
          cardIds: [playableCard.id],
        }),
      );
    }
  }

  throw new Error("Expected game to finish.");
}

function createRoom() {
  return createWaitingRoom(
    createClientEvent.createRoom({
      playerName: "Host",
      playerCount: 3,
      cpuCount: 0,
      rules,
    }),
    "room-1",
    createInviteCode("room-1"),
  );
}

function createCpuRoom() {
  return createWaitingRoom(
    createClientEvent.createRoom({
      playerName: "Host",
      playerCount: 3,
      cpuCount: 2,
      rules,
    }),
    "room-1",
    createInviteCode("room-1"),
  );
}

function createCpuTurnRoom() {
  let room = applyRoomClientEvent(
    readyAllHumanParticipants(createCpuRoom()),
    createClientEvent.startGame({
      roomId: "room-1",
      playerId: "player-1",
    }),
  );
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const game = expectGame(room);
    const participant = getParticipant(room, game.turnPlayerId);

    if (participant.kind === "cpu") {
      return room;
    }

    const player = game.players.find((candidate) => candidate.id === game.turnPlayerId);
    const card = player?.hand[0];

    if (player === undefined || card === undefined) {
      throw new Error("Expected current player with cards.");
    }

    room = applyRoomClientEvent(
      room,
      createClientEvent.playCards({
        roomId: room.id,
        playerId: player.id,
        cardIds: [card.id],
      }),
    );
  }

  throw new Error("Expected CPU turn.");
}

function createCpuOpeningRoom(cpuHand: readonly Card[]): RoomState {
  return {
    id: "room-1",
    inviteCode: "ROOM",
    playerCount: 3,
    status: "playing",
    hostPlayerId: "player-1",
    participants: [
      { id: "player-1", name: "Host", kind: "host", connected: true, ready: true },
      { id: "cpu-1", name: "CPU 1", kind: "cpu", connected: true, ready: true },
      { id: "player-2", name: "Guest", kind: "guest", connected: true, ready: true },
    ],
    rules,
    game: GameStateSchema.parse(
      createGameState(
        [
          { id: "player-1", hand: [card("4", "clubs")] },
          { id: "cpu-1", hand: cpuHand },
          { id: "player-2", hand: [card("6", "clubs")] },
        ],
        "cpu-1",
        { matchId: "match-1", rules },
      ),
    ),
  };
}

function createPlayableRoom() {
  return ["Guest 1", "Guest 2"].reduce(
    (room, playerName) =>
      applyRoomClientEvent(
        room,
        createClientEvent.joinRoom({
          roomId: room.id,
          playerName,
        }),
      ),
    createRoom(),
  );
}

function readyAllHumanParticipants(room: RoomState) {
  return room.participants
    .filter((participant) => participant.kind !== "cpu")
    .reduce(
      (nextRoom, participant) =>
        applyRoomClientEvent(
          nextRoom,
          createClientEvent.setReady({
            roomId: nextRoom.id,
            playerId: participant.id,
            ready: true,
          }),
        ),
      room,
    );
}

function card(rank: Rank, suit: Suit = "spades"): Card {
  return {
    id: `${suit}-${rank}`,
    rank,
    suit,
  };
}

function expectGame(room: RoomState) {
  if (room.game === null) {
    throw new Error("Expected game state.");
  }

  return room.game;
}

function getParticipant(room: RoomState, playerId: string) {
  const participant = room.participants.find((candidate) => candidate.id === playerId);

  if (participant === undefined) {
    throw new Error("Expected participant.");
  }

  return participant;
}
