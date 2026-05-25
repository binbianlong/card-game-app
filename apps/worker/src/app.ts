import { Hono } from "hono";
import { cors } from "hono/cors";
import { RoomStateSchema, createServerEvent, type RoomState, type ServerErrorCode } from "schema";
import { createRoomsRoute, type RoomsRouteOptions } from "./routes/rooms.ts";

type WorkerBindings = {
  RoomServer: DurableObjectNamespace;
};

type CreateWorkerAppOptions<Env extends WorkerBindings> = RoomsRouteOptions<Env>;

function createWorkerApp<Env extends WorkerBindings>({
  findRoomByInviteCode,
  joinRoom,
  saveRoom,
}: CreateWorkerAppOptions<Env>) {
  const app = new Hono<{ Bindings: Env }>();

  app.use("/api/*", cors());

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "card-game-app-worker",
    }),
  );
  app.route(
    "/api/rooms",
    createRoomsRoute({
      findRoomByInviteCode,
      joinRoom,
      saveRoom,
    }),
  );

  return app;
}

function createRoomStateEvent(room: RoomState) {
  return createServerEvent.roomState(room);
}

function createErrorEvent(code: ServerErrorCode, message: string) {
  return createServerEvent.error(code, message);
}

function parseRoomState(value: unknown) {
  return RoomStateSchema.parse(value);
}

export { createErrorEvent, createRoomStateEvent, createWorkerApp, parseRoomState };
