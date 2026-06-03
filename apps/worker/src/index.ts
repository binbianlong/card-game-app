import { getServerByName, routePartykitRequest } from "partyserver";
import { JoinRoomResponseSchema } from "schema";
import { createWorkerApp } from "./app.ts";
import { createInternalRoomRequest } from "./room-server/internal-request.ts";
import { RoomServer } from "./room-server/server.ts";
import { createRoomRepository } from "./rooms/repository.ts";

type Env = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RoomServer: DurableObjectNamespace<RoomServer>;
  ROOM_SERVER_SECRET: string;
  TRUSTED_ORIGINS?: string;
};

const app = createWorkerApp<Env>({
  async findRoomByInviteCode(env, inviteCode) {
    return createRoomRepository(env.DB).findRoomByInviteCode(inviteCode);
  },
  async getRoomHistory(env, roomId) {
    return createRoomRepository(env.DB).getRoomHistory(roomId);
  },
  async joinRoom(env, roomId, event) {
    const server = await getServerByName(env.RoomServer, roomId);

    const response = await server.fetch(
      createInternalRoomRequest({
        body: JSON.stringify(event),
        method: "POST",
        path: "/join",
        secret: env.ROOM_SERVER_SECRET,
      }),
    );

    if (response.ok) {
      const data = JoinRoomResponseSchema.parse(await response.clone().json());
      await createRoomRepository(env.DB).saveRoomMetadata(data.room);
    }

    return response;
  },
  async listMatchHistory(env, roomId) {
    return createRoomRepository(env.DB).listMatchHistory(roomId);
  },
  async listRoomHistory(env) {
    return createRoomRepository(env.DB).listRoomHistory();
  },
  async saveRoom(env, roomId, room) {
    const server = await getServerByName(env.RoomServer, roomId);
    const response = await server.fetch(
      createInternalRoomRequest({
        body: JSON.stringify(room),
        method: "PUT",
        path: "/state",
        secret: env.ROOM_SERVER_SECRET,
      }),
    );

    if (!response.ok) {
      return false;
    }

    await createRoomRepository(env.DB).saveRoomMetadata(room);

    return true;
  },
});

export { RoomServer };

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const partyResponse = await routePartykitRequest(request, env);

    return partyResponse ?? app.fetch(request, env, context);
  },
} satisfies ExportedHandler<Env>;
