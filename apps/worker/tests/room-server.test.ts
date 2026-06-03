import { describe, expect, test } from "vite-plus/test";
import { createClientEvent } from "schema";
import {
  validateConnectionEvent,
  validateConnectionToken,
} from "../src/room-server/connection-event.ts";
import {
  createInternalRoomRequest,
  validateInternalRoomRequest,
} from "../src/room-server/internal-request.ts";

describe("room server", () => {
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
      expectedConnectionToken: "token-1",
      hasParticipant: true,
      requestConnectionToken: "token-1",
    });

    expect(error).toBeNull();
  });

  test("rejects websocket connections with another player's token", () => {
    const error = validateConnectionToken({
      expectedConnectionToken: "token-1",
      hasParticipant: true,
      requestConnectionToken: "token-2",
    });

    expect(error).toMatchObject({
      code: "notAllowed",
    });
  });

  test("rejects websocket connections without a player token", () => {
    const error = validateConnectionToken({
      expectedConnectionToken: "token-1",
      hasParticipant: true,
      requestConnectionToken: null,
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
