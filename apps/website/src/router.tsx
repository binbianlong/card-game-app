import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import { CreateRoomPage } from "./screens/create-room-page";
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
    const players = clampSearchNumber(search.players, 2, 6, 4);
    const cpu = clampSearchNumber(search.cpu, 0, players - 1, 1);

    return { players, cpu };
  },
  component: WaitingRoomPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  rulesRoute,
  createRoomRoute,
  waitingRoomRoute,
]);

function clampSearchNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(numberValue, min), max);
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
