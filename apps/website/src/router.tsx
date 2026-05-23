import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import { CreateRoomPage } from "./screens/create-room-page";
import { PlayRoomPage } from "./screens/play-room-page";
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

const waitingRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/waiting",
  validateSearch: (search: Record<string, unknown>) => {
    const players = clampSearchNumber(search.players, 3, 6, 4);
    const cpu = clampSearchNumber(search.cpu, 0, players - 1, 1);

    return {
      players,
      cpu,
      eightCut: parseSearchBoolean(search.eightCut),
      revolution: parseSearchBoolean(search.revolution),
      sequence: parseSearchBoolean(search.sequence),
      suitLock: parseSearchBoolean(search.suitLock),
    };
  },
  component: WaitingRoomPage,
});

const playRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/play",
  validateSearch: (search: Record<string, unknown>) => {
    const players = clampSearchNumber(search.players, 3, 6, 4);
    const cpu = clampSearchNumber(search.cpu, 0, players - 1, 1);

    return {
      players,
      cpu,
      eightCut: parseSearchBoolean(search.eightCut),
      revolution: parseSearchBoolean(search.revolution),
      sequence: parseSearchBoolean(search.sequence),
      suitLock: parseSearchBoolean(search.suitLock),
    };
  },
  component: PlayRoomPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  rulesRoute,
  createRoomRoute,
  waitingRoomRoute,
  playRoomRoute,
]);

function clampSearchNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(numberValue, min), max);
}

function parseSearchBoolean(value: unknown) {
  return value === true || value === "true" || value === "1";
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
