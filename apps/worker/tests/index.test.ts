import { describe, expect, test } from "vite-plus/test";
import { createWorkerApp } from "../src/app.ts";

const app = createWorkerApp({
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
});

function createTestEnv() {
  return {
    RoomServer: {} as DurableObjectNamespace,
  };
}
