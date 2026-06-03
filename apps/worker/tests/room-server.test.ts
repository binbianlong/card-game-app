import { describe, expect, test } from "vite-plus/test";
import { createClientEvent, type RoomState } from "schema";
import { createRoomClientState } from "../src/room-server/client-state.ts";
import {
  validateConnectionEvent,
  validateConnectionToken,
} from "../src/room-server/connection-event.ts";
import {
  createInternalRoomRequest,
  validateInternalRoomRequest,
} from "../src/room-server/internal-request.ts";

describe("room server", () => {
  test("redacts other players' hands from client room states", () => {
    const room = createRoomClientState(createPlayingRoom(), "player-1");

    expect(room.game?.players).toEqual([
      expect.objectContaining({
        id: "player-1",
        hand: [{ id: "clubs-3", rank: "3", suit: "clubs" }],
        handCount: 1,
      }),
      expect.objectContaining({
        id: "player-2",
        hand: null,
        handCount: 1,
      }),
    ]);
  });

  test("accepts events from the matching connection player", () => {
    const error = validateConnectionEvent(
      "player-1",
      createClientEvent.setReady({
        roomId: "room-1",
        playerId: "player-1",
        ready: true,
      }),
    );

    expect(error).toBeNull();
  });

  test("rejects events that impersonate another player", () => {
    const error = validateConnectionEvent(
      "player-2",
      createClientEvent.startGame({
        roomId: "room-1",
        playerId: "player-1",
      }),
    );

    expect(error).toMatchObject({
      code: "notAllowed",
    });
  });

  test("rejects playerless events over WebSocket connections", () => {
    const error = validateConnectionEvent(
      "player-1",
      createClientEvent.joinRoom({
        roomId: "room-1",
        playerName: "Guest",
      }),
    );

    expect(error).toMatchObject({
      code: "notAllowed",
    });
  });

  test("accepts websocket connections with the matching player token", () => {
    const error = validateConnectionToken({
      expectedConnectionToken: {
        expiresAt: 2000,
        value: "token-1",
      },
      hasParticipant: true,
      now: 1000,
      requestConnectionToken: "token-1",
    });

    expect(error).toBeNull();
  });

  test("rejects websocket connections with another player's token", () => {
    const error = validateConnectionToken({
      expectedConnectionToken: {
        expiresAt: 2000,
        value: "token-1",
      },
      hasParticipant: true,
      now: 1000,
      requestConnectionToken: "token-2",
    });

    expect(error).toMatchObject({
      code: "notAllowed",
    });
  });

  test("rejects websocket connections without a player token", () => {
    const error = validateConnectionToken({
      expectedConnectionToken: {
        expiresAt: 2000,
        value: "token-1",
      },
      hasParticipant: true,
      now: 1000,
      requestConnectionToken: null,
    });

    expect(error).toMatchObject({
      code: "notAllowed",
    });
  });

  test("rejects websocket connections with an expired player token", () => {
    const error = validateConnectionToken({
      expectedConnectionToken: {
        expiresAt: 1000,
        value: "token-1",
      },
      hasParticipant: true,
      now: 1000,
      requestConnectionToken: "token-1",
    });

    expect(error).toMatchObject({
      code: "notAllowed",
    });
  });

  test("accepts internal room requests with the configured secret", () => {
    const request = createInternalRoomRequest({
      body: JSON.stringify({ ok: true }),
      method: "PUT",
      path: "/state",
      secret: "secret",
    });

    expect(validateInternalRoomRequest(request, "secret")).toEqual({ ok: true });
  });

  test("rejects internal room requests without the configured secret", () => {
    const request = new Request("https://room-server.internal/state", {
      body: JSON.stringify({ ok: true }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });

    expect(validateInternalRoomRequest(request, "secret")).toMatchObject({
      ok: false,
    });
  });

  test("rejects internal room requests when the secret is not configured", () => {
    const request = createInternalRoomRequest({
      body: JSON.stringify({ ok: true }),
      method: "PUT",
      path: "/state",
      secret: "secret",
    });

    expect(validateInternalRoomRequest(request, undefined)).toMatchObject({
      ok: false,
    });
  });
});

function createPlayingRoom(): RoomState {
  return {
    id: "room-1",
    inviteCode: "ROOM",
    playerCount: 3,
    status: "playing",
    hostPlayerId: "player-1",
    participants: [
      {
        id: "player-1",
        name: "Host",
        kind: "host",
        connected: true,
        ready: true,
      },
      {
        id: "player-2",
        name: "Guest",
        kind: "guest",
        connected: true,
        ready: true,
      },
    ],
    rules: {
      eightCut: true,
      elevenBack: true,
      revolution: true,
      sequence: true,
      suitLock: true,
    },
    game: {
      matchId: "match-1",
      phase: "playing",
      rules: {
        eightCut: true,
        elevenBack: true,
        revolution: true,
        sequence: true,
        suitLock: true,
      },
      players: [
        {
          id: "player-1",
          connected: true,
          hand: [{ id: "clubs-3", rank: "3", suit: "clubs" }],
        },
        {
          id: "player-2",
          connected: true,
          hand: [{ id: "spades-4", rank: "4", suit: "spades" }],
        },
      ],
      initialHands: [
        {
          playerId: "player-1",
          cards: [{ id: "clubs-3", rank: "3", suit: "clubs" }],
        },
        {
          playerId: "player-2",
          cards: [{ id: "spades-4", rank: "4", suit: "spades" }],
        },
      ],
      turnPlayerId: "player-1",
      table: {
        play: null,
        playedBy: null,
      },
      passedPlayerIds: [],
      elevenBack: false,
      revolution: false,
      suitLock: null,
      rankings: [],
    },
  };
}
