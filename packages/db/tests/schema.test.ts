import { describe, expect, test } from "vite-plus/test";
import { matchPlayers, matches, roomParticipants, rooms } from "../src/index.ts";

describe("db schema", () => {
  test("defines room management tables", () => {
    expect(rooms).toBeDefined();
    expect(roomParticipants).toBeDefined();
    expect(matches).toBeDefined();
    expect(matchPlayers).toBeDefined();
  });
});
