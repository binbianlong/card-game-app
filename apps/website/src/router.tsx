import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";
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

const routeTree = rootRoute.addChildren([indexRoute, rulesRoute]);

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
