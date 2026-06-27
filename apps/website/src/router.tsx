import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import { CreateRoomPage } from "./screens/create-room-page";
import { JoinRoomPage } from "./screens/join-room-page";
import { PlayRoomPage } from "./screens/play-room-page";
import { ReconnectRoomPage } from "./screens/reconnect-room-page";
import { RoomHistoryPage, RoomMatchHistoryPage } from "./screens/room-history-page";
import { RulesPage } from "./screens/rules-page";
import { WaitingRoomPage } from "./screens/waiting-room-page";

const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rules",
  component: RulesPage,
});

const createRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/new",
  component: CreateRoomPage,
});

const joinRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/join",
  component: JoinRoomPage,
});

const roomHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/history",
  component: RoomHistoryPage,
});

const roomMatchHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/history/$roomId",
  component: RoomMatchHistoryPage,
});

const waitingRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/waiting",
  validateSearch: parseRoomConnectionSearch,
  component: WaitingRoomPage,
});

const playRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/play",
  validateSearch: parseRoomConnectionSearch,
  component: PlayRoomPage,
});

const reconnectRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/reconnect",
  component: ReconnectRoomPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  rulesRoute,
  createRoomRoute,
  joinRoomRoute,
  roomHistoryRoute,
  roomMatchHistoryRoute,
  waitingRoomRoute,
  playRoomRoute,
  reconnectRoomRoute,
]);

function parseSearchOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function parseRoomConnectionSearch(search: Record<string, unknown>) {
  return {
    roomId: parseSearchOptionalString(search.roomId),
    playerId: parseSearchOptionalString(search.playerId),
  };
}

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
