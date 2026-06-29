import { describe, expect, test } from "vite-plus/test";
import type { CreateRoomResponse } from "schema";
import { createWorkerApp } from "../src/app.ts";

const app = createWorkerApp({
  async createConnectionTicket(_env, roomId, request) {
    if (
      roomId !== "room-1" ||
      request.playerId !== "player-1" ||
      request.connectionToken !== "host-token"
    ) {
      return null;
    }

    return "ticket-1";
  },
  async endRoom(_env, roomId, userId) {
    if (roomId !== "room-1" || userId !== "user-1") {
      return null;
    }

    return {
      id: "room-1",
      inviteCode: "A7K9Q2",
      playerCount: 3,
      status: "finished",
      hostPlayerId: "player-1",
      participants: [
        {
          id: "player-1",
          name: "Host",
          kind: "host",
          connected: false,
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
    };
  },
  async findRoomByInviteCode(_env, inviteCode) {
    if (inviteCode !== "A7K9Q2") {
      return null;
    }

    return {
      id: "room-1",
      inviteCode,
    };
  },
  async getRoomHistory(_env, roomKey, userId) {
    if (userId !== "user-1" || (roomKey !== "A7K9Q2" && roomKey !== "room-1")) {
      return null;
    }

    return {
      id: "room-1",
      playerCount: 3,
      status: "finished",
      createdAt: 1,
      matchCount: 1,
      latestFinishedAt: 2,
    };
  },
  async getSessionUser(_env, request) {
    const token = request.headers.get("authorization");

    if (token === "Bearer test-session") {
      return { id: "user-1" };
    }

    if (token === "Bearer other-session") {
      return { id: "user-2" };
    }

    return null;
  },
  async joinRoom(_env, roomId, event) {
    if (roomId !== "room-1" || event.roomId !== "room-1") {
      return Response.json(
        { type: "error", code: "notAllowed", message: "Wrong room." },
        {
          status: 403,
        },
      );
    }

    return Response.json({
      connectionToken: "guest-token",
      playerId: "player-2",
      room: {
        id: "room-1",
        inviteCode: "A7K9Q2",
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
      websocketPath: "/parties/room-server/room-1",
    });
  },
  async listReconnectableRooms(_env, userId) {
    if (userId !== "user-1") {
      return [];
    }

    return [
      {
        roomId: "room-1",
        playerId: "player-1",
        playerCount: 3,
        isHost: true,
        participants: [
          { name: "Host", kind: "host" },
          { name: "Guest", kind: "guest" },
          { name: "CPU 1", kind: "cpu" },
        ],
      },
    ];
  },
  async reconnectRoom(_env, roomId, userId) {
    if (roomId !== "room-1" || userId !== "user-1") {
      return null;
    }

    return {
      connectionToken: "reconnect-token",
      playerId: "player-1",
      room: {
        id: "room-1",
        inviteCode: "A7K9Q2",
        playerCount: 3,
        status: "playing",
        hostPlayerId: "player-1",
        participants: [
          {
            id: "player-1",
            name: "Host",
            kind: "host",
            connected: false,
            ready: true,
          },
          {
            id: "player-2",
            name: "Guest",
            kind: "guest",
            connected: true,
            ready: true,
          },
          {
            id: "player-3",
            name: "CPU 1",
            kind: "cpu",
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
        game: null,
      },
      websocketPath: "/parties/room-server/room-1",
    };
  },
  async listMatchHistory(_env, roomId, userId) {
    if (userId !== "user-1" || roomId !== "room-1") {
      return [];
    }

    return [
      {
        id: "match-1",
        roomId: "room-1",
        playerCount: 3,
        status: "finished",
        startedAt: 1,
        finishedAt: 2,
        rules: {
          eightCut: true,
          elevenBack: true,
          revolution: true,
          sequence: true,
          suitLock: true,
        },
        players: [],
      },
    ];
  },
  async listRoomHistory(_env, userId) {
    if (userId !== "user-1") {
      return [];
    }

    return [
      {
        id: "room-1",
        playerCount: 3,
        status: "finished",
        createdAt: 1,
        matchCount: 1,
        latestFinishedAt: 2,
      },
    ];
  },
  async saveRoom() {
    return "host-token";
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
          roomId: "A7K9Q2",
          playerName: "Guest",
        }),
        headers: {
          authorization: "Bearer test-session",
          "content-type": "application/json",
        },
        method: "POST",
      }),
      createTestEnv(),
    );

    await expect(response.json()).resolves.toMatchObject({
      connectionToken: "guest-token",
      playerId: "player-2",
      room: {
        id: "room-1",
        inviteCode: "A7K9Q2",
      },
      websocketPath: "/parties/room-server/room-1",
    });
  });

  test("rejects room joins from anonymous users", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/join", {
        body: JSON.stringify({
          type: "joinRoom",
          roomId: "A7K9Q2",
          playerName: "Guest",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
    });
  });

  test("creates rooms for logged-in users", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms", {
        body: JSON.stringify({
          type: "createRoom",
          playerName: "Host",
          playerCount: 3,
          cpuCount: 0,
          rules: {
            eightCut: false,
            elevenBack: false,
            revolution: false,
            sequence: false,
            suitLock: false,
          },
        }),
        headers: {
          authorization: "Bearer test-session",
          "content-type": "application/json",
        },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as CreateRoomResponse;

    expect(data).toMatchObject({
      connectionToken: "host-token",
      room: {
        hostPlayerId: "player-1",
        status: "waiting",
      },
    });
    expect(data.room.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(data.room.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(data.websocketPath).toBe(`/parties/room-server/${data.room.id}`);
  });

  test("rejects room creation from anonymous users", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms", {
        body: JSON.stringify({
          type: "createRoom",
          playerName: "Host",
          playerCount: 3,
          cpuCount: 0,
          rules: {
            eightCut: false,
            elevenBack: false,
            revolution: false,
            sequence: false,
            suitLock: false,
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
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
        headers: {
          authorization: "Bearer test-session",
          "content-type": "application/json",
        },
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

  test("creates one-time websocket connection tickets", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/room-1/ticket", {
        body: JSON.stringify({
          connectionToken: "host-token",
          playerId: "player-1",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ticket: "ticket-1",
    });
  });

  test("rejects websocket connection ticket requests with invalid tokens", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/room-1/ticket", {
        body: JSON.stringify({
          connectionToken: "wrong-token",
          playerId: "player-1",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
    });
  });

  test("lists reconnectable rooms with participant names", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/reconnectable", {
        headers: { authorization: "Bearer test-session" },
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rooms: [
        {
          roomId: "room-1",
          playerId: "player-1",
          playerCount: 3,
          isHost: true,
          participants: [
            { name: "Host", kind: "host" },
            { name: "Guest", kind: "guest" },
            { name: "CPU 1", kind: "cpu" },
          ],
        },
      ],
    });
  });

  test("reconnects rooms for participants", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/room-1/reconnect", {
        headers: { authorization: "Bearer test-session" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      connectionToken: "reconnect-token",
      playerId: "player-1",
      room: {
        id: "room-1",
      },
      websocketPath: "/parties/room-server/room-1",
    });
  });

  test("rejects room reconnects from non-participants", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/room-1/reconnect", {
        headers: { authorization: "Bearer other-session" },
        method: "POST",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
    });
  });

  test("ends rooms for hosts", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/room-1", {
        headers: { authorization: "Bearer test-session" },
        method: "DELETE",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      room: {
        id: "room-1",
        status: "finished",
        game: null,
      },
    });
  });

  test("rejects room endings from non-hosts", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/room-1", {
        headers: { authorization: "Bearer other-session" },
        method: "DELETE",
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
    });
  });

  test("lists room history", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history", {
        headers: { authorization: "Bearer test-session" },
      }),
      createTestEnv(),
    );

    await expect(response.json()).resolves.toMatchObject({
      rooms: [
        {
          id: "room-1",
          status: "finished",
          matchCount: 1,
        },
      ],
    });
  });

  test("rejects room history from anonymous users", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history"),
      createTestEnv(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
    });
  });

  test("does not list room history for non-participants", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history", {
        headers: { authorization: "Bearer other-session" },
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rooms: [],
    });
  });

  test("lists match history in a room", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history/A7K9Q2", {
        headers: { authorization: "Bearer test-session" },
      }),
      createTestEnv(),
    );

    await expect(response.json()).resolves.toMatchObject({
      room: {
        id: "room-1",
      },
      matches: [
        {
          id: "match-1",
          roomId: "room-1",
          status: "finished",
        },
      ],
    });
  });

  test("rejects match history from anonymous users", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history/A7K9Q2"),
      createTestEnv(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "notAllowed",
      type: "error",
    });
  });

  test("does not show match history to non-participants", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history/A7K9Q2", {
        headers: { authorization: "Bearer other-session" },
      }),
      createTestEnv(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "roomNotFound",
      type: "error",
    });
  });

  test("allows credentialed CORS from trusted origins", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history", {
        headers: {
          origin: "https://app.example",
        },
      }),
      createTestEnv({
        TRUSTED_ORIGINS: "https://app.example, https://admin.example",
      }),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  test("does not reflect credentialed CORS from untrusted origins", async () => {
    const response = await app.fetch(
      new Request("https://worker.test/api/rooms/history", {
        headers: {
          origin: "https://evil.example",
        },
      }),
      createTestEnv({
        TRUSTED_ORIGINS: "https://app.example",
      }),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});

type TestEnv = {
  DB: D1Database;
  RoomServer: DurableObjectNamespace;
  TRUSTED_ORIGINS?: string;
};

function createTestEnv(overrides: Partial<TestEnv> = {}): TestEnv {
  return {
    DB: {} as D1Database,
    RoomServer: {} as DurableObjectNamespace,
    ...overrides,
  };
}
