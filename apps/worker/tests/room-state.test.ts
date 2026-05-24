import { describe, expect, test } from "vite-plus/test";
import { createClientEvent } from "schema";
import {
  RoomStateError,
  applyRoomClientEvent,
  createInviteCode,
  createWaitingRoom,
} from "../src/room-state.ts";

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

  test("starts games and stores game state in room state", () => {
    const room = createPlayableRoom();
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

  test("advances cpu turns on the server", () => {
    const room = createCpuRoom();
    const playingRoom = applyRoomClientEvent(
      room,
      createClientEvent.startGame({
        roomId: room.id,
        playerId: room.hostPlayerId,
      }),
    );
    const game = expectGame(playingRoom);

    expect(getParticipant(playingRoom, game.turnPlayerId).kind).not.toBe("cpu");
  });

  test("stores game actions in room state", () => {
    const room = applyRoomClientEvent(
      createPlayableRoom(),
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

function expectGame(room: ReturnType<typeof createRoom>) {
  if (room.game === null) {
    throw new Error("Expected game state.");
  }

  return room.game;
}

function getParticipant(room: ReturnType<typeof createRoom>, playerId: string) {
  const participant = room.participants.find((candidate) => candidate.id === playerId);

  if (participant === undefined) {
    throw new Error("Expected participant.");
  }

  return participant;
}
