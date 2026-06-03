import { describe, expect, test } from "vite-plus/test";
import { createClientEvent } from "schema";
import { validateConnectionEvent } from "../src/room-server/connection-event.ts";

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
});
