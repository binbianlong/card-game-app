import {
  ClientEventSchema,
  CreateConnectionTicketRequestSchema,
  getRoomWebSocketPath,
  type ClientEvent,
  type RoomState,
} from "schema";
import { createErrorEvent, parseRoomState } from "../app.ts";
import { RoomStateError } from "../rooms/state.ts";
import { validateInternalRoomRequest } from "./internal-request.ts";

type InternalRoomHandler = {
  applyClientEvent: (event: ClientEvent) => Promise<RoomState>;
  getRoom: () => Promise<RoomState>;
  getStoredRoom: () => Promise<RoomState | undefined>;
  scheduleCpuTurn: (room: RoomState) => Promise<void>;
  sendRoomStateToConnections: (room: RoomState) => void;
  setConnectionTicket: (request: { connectionToken: string; playerId: string }) => Promise<string>;
  setConnectionToken: (playerId: string) => Promise<string>;
  setRoom: (room: RoomState) => Promise<RoomState>;
  validateConnectionToken: (
    playerId: string,
    requestToken: string | null,
  ) => Promise<RoomStateError | null>;
};

async function handleInternalRoomRequest({
  handler,
  request,
  secret,
}: {
  handler: InternalRoomHandler;
  request: Request;
  secret: string | undefined;
}) {
  const url = new URL(request.url);
  const internalRequestValidation = validateInternalRoomRequest(request, secret);

  if (!internalRequestValidation.ok) {
    return Response.json(createErrorEvent("notAllowed", internalRequestValidation.message), {
      status: 403,
    });
  }

  if (request.method === "GET" && url.pathname === "/state") {
    return Response.json(await handler.getRoom());
  }

  if (request.method === "PUT" && url.pathname === "/state") {
    return handleSetRoomRequest(request, handler);
  }

  if (request.method === "POST" && url.pathname === "/join") {
    return handleJoinRoomRequest(request, handler);
  }

  if (request.method === "POST" && url.pathname === "/ticket") {
    return handleCreateTicketRequest(request, handler);
  }

  return new Response("Not Found", { status: 404 });
}

async function handleSetRoomRequest(request: Request, handler: InternalRoomHandler) {
  const body = await request.json().catch(() => null);
  const room = parseRoomState(body);

  await handler.setRoom(room);
  const connectionToken = await handler.setConnectionToken(room.hostPlayerId);
  await handler.scheduleCpuTurn(room);

  return Response.json({
    connectionToken,
    room,
    websocketPath: getRoomWebSocketPath(room.id),
  });
}

async function handleJoinRoomRequest(request: Request, handler: InternalRoomHandler) {
  const storedRoom = await handler.getStoredRoom();

  if (storedRoom === undefined) {
    return Response.json(createErrorEvent("roomNotFound", "Room was not found."), {
      status: 404,
    });
  }

  const body = await request.json().catch(() => null);
  const event = ClientEventSchema.safeParse(body);

  if (!event.success || event.data.type !== "joinRoom") {
    return Response.json(createErrorEvent("invalidEvent", "joinRoom event is required."), {
      status: 400,
    });
  }

  const nextRoom = await handler.applyClientEvent(event.data).catch((error: unknown) => {
    if (error instanceof RoomStateError) {
      return Response.json(createErrorEvent(error.code, error.message), { status: 400 });
    }

    throw error;
  });

  if (nextRoom instanceof Response) {
    return nextRoom;
  }

  const playerId = getJoinedPlayerId(storedRoom, nextRoom);
  const connectionToken = await handler.setConnectionToken(playerId);

  handler.sendRoomStateToConnections(nextRoom);
  await handler.scheduleCpuTurn(nextRoom);

  return Response.json({
    connectionToken,
    playerId,
    room: nextRoom,
    websocketPath: getRoomWebSocketPath(nextRoom.id),
  });
}

async function handleCreateTicketRequest(request: Request, handler: InternalRoomHandler) {
  const body = await request.json().catch(() => null);
  const ticketRequest = CreateConnectionTicketRequestSchema.safeParse(body);

  if (!ticketRequest.success) {
    return Response.json(
      createErrorEvent("invalidEvent", "Connection ticket request is required."),
      {
        status: 400,
      },
    );
  }

  const tokenError = await handler.validateConnectionToken(
    ticketRequest.data.playerId,
    ticketRequest.data.connectionToken,
  );

  if (tokenError !== null) {
    return Response.json(createErrorEvent(tokenError.code, tokenError.message), {
      status: 403,
    });
  }

  return Response.json({
    ticket: await handler.setConnectionTicket(ticketRequest.data),
  });
}

function getJoinedPlayerId(previousRoom: RoomState, nextRoom: RoomState) {
  const previousPlayerIds = new Set(previousRoom.participants.map((participant) => participant.id));
  const joinedParticipant = nextRoom.participants.find(
    (participant) => !previousPlayerIds.has(participant.id),
  );

  if (joinedParticipant === undefined) {
    throw new RoomStateError("notAllowed", "Player did not join this room.");
  }

  return joinedParticipant.id;
}

export { handleInternalRoomRequest };
