import type { Meta, StoryObj } from "@storybook/react-vite";
import type { GameRuleSettings, RoomClientState, RoomParticipant } from "schema";
import { WaitingRoomView } from "./waiting-room-view";

const noop = () => {};

const defaultRules = {
  eightCut: true,
  elevenBack: true,
  revolution: true,
  sequence: false,
  suitLock: false,
} satisfies GameRuleSettings;

const participants = [
  { id: "host", name: "binbi", kind: "host", connected: true, ready: true },
  { id: "guest-1", name: "ゲストA", kind: "guest", connected: true, ready: false },
  { id: "cpu-1", name: "CPU 1", kind: "cpu", connected: true, ready: true },
] satisfies RoomParticipant[];

function createRoom(overrides: Partial<RoomClientState> = {}): RoomClientState {
  return {
    id: "room-1",
    inviteCode: "A7K9Q2",
    playerCount: 4,
    status: "waiting",
    hostPlayerId: "host",
    participants,
    rules: defaultRules,
    game: null,
    ...overrides,
  };
}

const meta = {
  title: "Features/WaitingRoom/WaitingRoomView",
  component: WaitingRoomView,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[390px] max-w-[calc(100vw-32px)]">
        <Story />
      </div>
    ),
  ],
  args: {
    connectionStatus: "open",
    errorMessage: null,
    isConnected: true,
    isReadyToStart: false,
    localRules: defaultRules,
    onStartGame: noop,
    onToggleLocalRule: noop,
    onToggleReady: noop,
    playerId: "guest-1",
    room: createRoom(),
  },
} satisfies Meta<typeof WaitingRoomView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WaitingForPlayers: Story = {};

export const ReadyToStart: Story = {
  args: {
    isReadyToStart: true,
    playerId: "host",
    room: createRoom({
      participants: participants.map((participant) => ({ ...participant, ready: true })),
    }),
  },
};

export const GuestReadyToStart: Story = {
  args: {
    isReadyToStart: true,
    playerId: "guest-1",
    room: createRoom({
      participants: participants.map((participant) => ({ ...participant, ready: true })),
    }),
  },
};

export const Connecting: Story = {
  args: {
    connectionStatus: "connecting",
    isConnected: false,
    room: null,
  },
};

export const WithConnectionError: Story = {
  args: {
    connectionStatus: "closed",
    errorMessage: "ルームサーバーとの接続が切れました。",
    isConnected: false,
  },
};

export const EmptyRoomState: Story = {
  args: {
    room: createRoom({
      participants: [],
      playerCount: 3,
    }),
  },
};
