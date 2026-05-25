import { describe, expect, test } from "vite-plus/test";
import { roomParticipants, rooms } from "../src/index.ts";

describe("db schema", () => {
  test("defines room management tables", () => {
    expect(rooms).toBeDefined();
    expect(roomParticipants).toBeDefined();
  });
});
