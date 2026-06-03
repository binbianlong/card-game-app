import { RoomStateError } from "../rooms/state.ts";

type ConnectionTicket = {
  connectionToken: string;
  expiresAt: number;
  playerId: string;
};

type ConnectionTicketConsumeResult =
  | {
      connectionToken: string;
      ok: true;
    }
  | {
      error: RoomStateError;
      ok: false;
    };

const connectionTicketTtlMs = 30 * 1000;
const connectionTicketsStorageKey = "connectionTickets";

async function setConnectionTicket(
  storage: DurableObjectStorage,
  {
    connectionToken,
    playerId,
  }: {
    connectionToken: string;
    playerId: string;
  },
) {
  const tickets = await getConnectionTickets(storage);
  const ticket = crypto.randomUUID();
  const now = Date.now();

  await storage.put(connectionTicketsStorageKey, {
    ...removeExpiredConnectionTickets(tickets, now),
    [ticket]: {
      connectionToken,
      expiresAt: now + connectionTicketTtlMs,
      playerId,
    },
  });

  return ticket;
}

async function consumeConnectionTicket({
  playerId,
  request,
  storage,
  validateConnectionToken,
}: {
  playerId: string;
  request: Request;
  storage: DurableObjectStorage;
  validateConnectionToken: (
    playerId: string,
    requestToken: string | null,
  ) => Promise<RoomStateError | null>;
}): Promise<ConnectionTicketConsumeResult> {
  const requestTicket = getRequestConnectionTicket(request);

  if (requestTicket === null || requestTicket.length === 0) {
    return {
      error: new RoomStateError("notAllowed", "Connection ticket is required."),
      ok: false,
    };
  }

  const tickets = await getConnectionTickets(storage);
  const now = Date.now();
  const ticket = tickets[requestTicket];
  const nextTickets = removeExpiredConnectionTickets(tickets, now);

  delete nextTickets[requestTicket];
  await storage.put(connectionTicketsStorageKey, nextTickets);

  if (ticket === undefined) {
    return {
      error: new RoomStateError("notAllowed", "Connection ticket is invalid."),
      ok: false,
    };
  }

  if (ticket.expiresAt <= now) {
    return {
      error: new RoomStateError("notAllowed", "Connection ticket has expired."),
      ok: false,
    };
  }

  if (ticket.playerId !== playerId) {
    return {
      error: new RoomStateError("notAllowed", "Connection ticket does not match the player."),
      ok: false,
    };
  }

  const tokenError = await validateConnectionToken(playerId, ticket.connectionToken);

  if (tokenError !== null) {
    return {
      error: tokenError,
      ok: false,
    };
  }

  return {
    connectionToken: ticket.connectionToken,
    ok: true,
  };
}

async function getConnectionTickets(storage: DurableObjectStorage) {
  return (await storage.get<Record<string, ConnectionTicket>>(connectionTicketsStorageKey)) ?? {};
}

function getRequestConnectionTicket(request: Request) {
  return new URL(request.url).searchParams.get("ticket");
}

function removeExpiredConnectionTickets(tickets: Record<string, ConnectionTicket>, now: number) {
  return Object.fromEntries(Object.entries(tickets).filter(([, ticket]) => ticket.expiresAt > now));
}

export { consumeConnectionTicket, setConnectionTicket };
export type { ConnectionTicketConsumeResult };
