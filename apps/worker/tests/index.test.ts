import { describe, expect, test } from "vite-plus/test";
import { createWorkerApp } from "../src/app.ts";

const app = createWorkerApp({
  async findRoomByInviteCode(_env, inviteCode) {
    if (inviteCode !== "ROOM") {
      return null;
    }

    return {
      id: "room-1",
      inviteCode,
    };
  },
  async joinRoom() {
    return Response.json({
      playerId: "player-2",
      room: {
        id: "room-1",
        inviteCode: "ROOM",
        playerCount: 3,
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
          {
            id: "player-2",
            name: "Guest",
            kind: "guest",
            connected: true,
            ready: false,
          },
        ],
        rules: {
          eightCut: true,
          elevenBack: true,
          revolution: true,
          sequence: true,
          suitLock: true,
        },
        game: null,
      },
      websocketPath: "/parties/room-server/ROOM",
    });
  },
  async saveRoom() {
    return true;
  },
});

describe("worker", () => {
  test("responds to health checks", async () => {
    const response = await app.fetch(new Request("https://worker.test/health"), createTestEnv());

    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "card-game-app-worker",
    });
  });

  test("joins rooms by invite code", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/join", {
        body: JSON.stringify({
          type: "joinRoom",
          roomId: "ROOM",
          playerName: "Guest",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createTestEnv(),
    );

    await expect(response.json()).resolves.toMatchObject({
      playerId: "player-2",
      room: {
        id: "room-1",
        inviteCode: "ROOM",
      },
      websocketPath: "/parties/room-server/ROOM",
    });
  });

  test("rejects joins when invite codes are not stored", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/join", {
        body: JSON.stringify({
          type: "joinRoom",
          roomId: "NONE",
          playerName: "Guest",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      type: "error",
      code: "roomNotFound",
    });
  });
});

function createTestEnv() {
  return {
    DB: {} as D1Database,
    RoomServer: {} as DurableObjectNamespace,
  };
}
