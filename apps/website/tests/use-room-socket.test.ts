import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createRoomSocket } from "../src/features/room-socket/use-room-socket.ts";

type QueryParams = Record<string, string | null | undefined>;

const partySocketMock = vi.hoisted(() => {
  type Listener = (event: unknown) => void;
  type Query = QueryParams | (() => QueryParams | Promise<QueryParams>);

  class MockPartySocket {
    static instances: MockPartySocket[] = [];

    readonly closeCalls: { code?: number; reason?: string }[] = [];
    readonly listeners = new Map<string, Listener[]>();
    readonly reconnectResults: Promise<QueryParams | undefined>[] = [];
    readonly options: { query?: Query };

    constructor(options: { query?: Query }) {
      this.options = options;
      MockPartySocket.instances.push(this);
    }

    addEventListener(type: string, listener: Listener) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    close(code?: number, reason?: string) {
      this.closeCalls.push({ code, reason });
    }

    reconnect() {
      const query = this.options.query;
      const result = Promise.resolve(typeof query === "function" ? query() : query);

      this.reconnectResults.push(result);

      return result;
    }

    send() {}
  }

  return { MockPartySocket };
});

const roomApiMock = vi.hoisted(() => ({
  createRoomConnectionTicket: vi.fn(),
  getWorkerHost: vi.fn(() => "worker.test"),
  RoomConnectionTicketError: class RoomConnectionTicketError extends Error {
    readonly status: number;

    constructor(status: number) {
      super("Failed to create connection ticket.");
      this.status = status;
    }
  },
}));

vi.mock("partysocket", () => ({
  default: partySocketMock.MockPartySocket,
}));

vi.mock("@/features/rooms/room-api", () => roomApiMock);

describe("createRoomSocket", () => {
  beforeEach(() => {
    partySocketMock.MockPartySocket.instances.length = 0;
    roomApiMock.createRoomConnectionTicket.mockReset();
    roomApiMock.getWorkerHost.mockClear();
  });

  test("issues a fresh connection ticket for reconnects", async () => {
    roomApiMock.createRoomConnectionTicket
      .mockResolvedValueOnce("ticket-1")
      .mockResolvedValueOnce("ticket-2");

    createRoomSocket({
      connectionToken: "connection-token-1",
      onClose: vi.fn(),
      onError: vi.fn(),
      onMessage: vi.fn(),
      onOpen: vi.fn(),
      onReconnectRequired: vi.fn(),
      playerId: "player-1",
      roomId: "room-1",
    });
    const mockSocket = partySocketMock.MockPartySocket.instances[0];

    const initialQuery = await mockSocket.reconnectResults[0];
    const reconnectQuery = await mockSocket.reconnect();

    expect(roomApiMock.createRoomConnectionTicket).toHaveBeenCalledTimes(2);
    expect(initialQuery).toEqual({ ticket: "ticket-1" });
    expect(reconnectQuery).toEqual({ ticket: "ticket-2" });
    expect(roomApiMock.createRoomConnectionTicket).toHaveBeenNthCalledWith(1, {
      connectionToken: "connection-token-1",
      playerId: "player-1",
      roomId: "room-1",
    });
    expect(roomApiMock.createRoomConnectionTicket).toHaveBeenNthCalledWith(2, {
      connectionToken: "connection-token-1",
      playerId: "player-1",
      roomId: "room-1",
    });
  });
});
