import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
import { CreateRoomPage } from "./screens/create-room-page";
import { RulesPage } from "./screens/rules-page";

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

const routeTree = rootRoute.addChildren([indexRoute, rulesRoute, createRoomRoute]);

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
