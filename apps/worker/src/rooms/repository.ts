import { matchPlayers, matches, roomParticipants, rooms } from "db";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  CardSchema,
  GameRuleSettingsSchema,
  type Card,
  type GameRuleSettings,
  type MatchHistoryItem,
  type RoomHistoryItem,
  type RoomState,
} from "schema";

type SaveRoomMetadataOptions = {
  hostUserId?: string;
  playerUserIds?: Record<string, string>;
};

type RoomHistoryRoomRow = {
  id: string;
  playerCount: number;
  status: RoomHistoryItem["status"];
  createdAt: Date;
};

type FinishedMatchSummaryRow = {
  finishedAt: Date | null;
};

function createRoomRepository(database: D1Database) {
  const db = drizzle(database);

  return {
    async findRoomByInviteCode(inviteCode: string) {
      const row = await db
        .select({
          id: rooms.id,
          inviteCode: rooms.inviteCode,
        })
        .from(rooms)
        .where(eq(rooms.inviteCode, inviteCode))
        .get();

      return row ?? null;
    },

    async canEndRoom(roomId: string, userId: string) {
      const row = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(and(eq(rooms.id, roomId), eq(rooms.hostUserId, userId), isNull(rooms.endedAt)))
        .get();

      return row !== undefined;
    },

    async saveRoomMetadata(room: RoomState, options: SaveRoomMetadataOptions = {}) {
      const now = new Date();
      const endedAt = isEndedRoom(room) ? now : null;
      const roomUpdate = {
        endedAt,
        inviteCode: room.inviteCode,
        hostPlayerId: room.hostPlayerId,
        playerCount: room.playerCount,
        status: room.status,
        updatedAt: now,
        ...(options.hostUserId === undefined ? {} : { hostUserId: options.hostUserId }),
      };

      await db
        .insert(rooms)
        .values({
          id: room.id,
          inviteCode: room.inviteCode,
          hostUserId: options.hostUserId ?? null,
          hostPlayerId: room.hostPlayerId,
          playerCount: room.playerCount,
          status: room.status,
          endedAt,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: rooms.id,
          set: roomUpdate,
        });

      await Promise.all(
        room.participants.map((participant) => {
          const userId = options.playerUserIds?.[participant.id];
          const participantUpdate = {
            displayName: participant.name,
            kind: participant.kind,
            connected: participant.connected,
            ready: participant.ready,
            leftAt: participant.connected ? null : now,
            updatedAt: now,
            ...(userId === undefined ? {} : { userId }),
          };

          return db
            .insert(roomParticipants)
            .values({
              id: createRoomParticipantRowId(room.id, participant.id),
              roomId: room.id,
              playerId: participant.id,
              userId: userId ?? null,
              displayName: participant.name,
              kind: participant.kind,
              connected: participant.connected,
              ready: participant.ready,
              joinedAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: roomParticipants.id,
              set: participantUpdate,
            });
        }),
      );

      if (room.game?.phase === "finished") {
        await saveMatchSnapshot(room, now);
      }
    },

    async listRoomHistory(userId: string, limit = 20): Promise<readonly RoomHistoryItem[]> {
      const accessibleRoomIds = await getAccessibleRoomIds(userId);

      if (accessibleRoomIds.length === 0) {
        return [];
      }

      const matchRows = await db
        .select({
          roomId: matches.roomId,
          finishedAt: matches.finishedAt,
        })
        .from(matches)
        .where(and(eq(matches.status, "finished"), inArray(matches.roomId, accessibleRoomIds)));

      const roomRows = await db
        .select()
        .from(rooms)
        .where(inArray(rooms.id, accessibleRoomIds))
        .orderBy(desc(rooms.createdAt))
        .limit(limit);

      return roomRows
        .filter(
          (room) =>
            room.status === "finished" || matchRows.some((match) => match.roomId === room.id),
        )
        .map((room) => {
          const roomMatches = matchRows.filter((match) => match.roomId === room.id);

          return createRoomHistoryItem(room, roomMatches);
        });
    },

    async getRoomHistory(roomKey: string, userId: string): Promise<RoomHistoryItem | null> {
      const room = await db
        .select()
        .from(rooms)
        .where(or(eq(rooms.id, roomKey), eq(rooms.inviteCode, normalizeInviteCode(roomKey))))
        .get();

      if (room === undefined) {
        return null;
      }

      if (!(await canAccessRoom(userId, room.id))) {
        return null;
      }

      const matchRows = await db
        .select({
          roomId: matches.roomId,
          finishedAt: matches.finishedAt,
        })
        .from(matches)
        .where(and(eq(matches.roomId, room.id), eq(matches.status, "finished")));

      return createRoomHistoryItem(room, matchRows);
    },

    async listMatchHistory(
      roomId: string,
      userId: string,
      limit = 20,
    ): Promise<readonly MatchHistoryItem[]> {
      if (!(await canAccessRoom(userId, roomId))) {
        return [];
      }

      const matchRows = await db
        .select()
        .from(matches)
        .where(and(eq(matches.roomId, roomId), eq(matches.status, "finished")))
        .orderBy(desc(matches.startedAt))
        .limit(limit);

      if (matchRows.length === 0) {
        return [];
      }

      const matchIds = matchRows.map((match) => match.id);
      const playerRows = await db
        .select()
        .from(matchPlayers)
        .where(inArray(matchPlayers.matchId, matchIds));
      const playersByMatchId = new Map(
        matchRows.map((match) => [
          match.id,
          playerRows
            .filter((player) => player.matchId === match.id)
            .sort(
              (left, right) =>
                (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER),
            ),
        ]),
      );

      return matchRows.map(
        (match): MatchHistoryItem => ({
          id: match.id,
          roomId: match.roomId,
          playerCount: match.playerCount,
          status: match.status,
          startedAt: match.startedAt.getTime(),
          finishedAt: match.finishedAt?.getTime() ?? null,
          rules: parseRules(match.rulesJson),
          players:
            playersByMatchId.get(match.id)?.map((player) => ({
              playerId: player.playerId,
              name: player.displayName,
              kind: player.kind,
              rank: player.rank,
              initialHand: parseCards(player.initialHandJson),
              remainingHand: parseCards(player.remainingHandJson),
            })) ?? [],
        }),
      );
    },
  };

  async function saveMatchSnapshot(room: RoomState, now: Date) {
    if (room.game === null) {
      return;
    }

    const game = room.game;

    await db
      .insert(matches)
      .values({
        id: game.matchId,
        roomId: room.id,
        inviteCode: room.inviteCode,
        playerCount: room.playerCount,
        status: game.phase,
        rulesJson: JSON.stringify(room.rules),
        startedAt: now,
        finishedAt: game.phase === "finished" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          status: game.phase,
          finishedAt: game.phase === "finished" ? now : null,
          rulesJson: JSON.stringify(room.rules),
          updatedAt: now,
        },
      });

    await Promise.all(
      room.participants.map((participant) => {
        const initialHand = game.initialHands.find(
          (candidate) => candidate.playerId === participant.id,
        );
        const playerState = game.players.find((candidate) => candidate.id === participant.id);
        const rankIndex = game.rankings.indexOf(participant.id);

        return db
          .insert(matchPlayers)
          .values({
            id: createMatchPlayerRowId(game.matchId, participant.id),
            matchId: game.matchId,
            roomId: room.id,
            playerId: participant.id,
            displayName: participant.name,
            kind: participant.kind,
            rank: rankIndex === -1 ? null : rankIndex + 1,
            initialHandJson: JSON.stringify(initialHand?.cards ?? []),
            remainingHandJson: JSON.stringify(playerState?.hand ?? []),
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: matchPlayers.id,
            set: {
              displayName: participant.name,
              kind: participant.kind,
              rank: rankIndex === -1 ? null : rankIndex + 1,
              remainingHandJson: JSON.stringify(playerState?.hand ?? []),
              updatedAt: now,
            },
          });
      }),
    );
  }

  async function getAccessibleRoomIds(userId: string) {
    const hostedRooms = await db
      .select({ roomId: rooms.id })
      .from(rooms)
      .where(eq(rooms.hostUserId, userId));
    const joinedRooms = await db
      .select({ roomId: roomParticipants.roomId })
      .from(roomParticipants)
      .where(eq(roomParticipants.userId, userId));

    return unique([...hostedRooms, ...joinedRooms].map((room) => room.roomId));
  }

  async function canAccessRoom(userId: string, roomId: string) {
    const hostedRoom = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.hostUserId, userId)))
      .get();

    if (hostedRoom !== undefined) {
      return true;
    }

    const joinedRoom = await db
      .select({ id: roomParticipants.id })
      .from(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, userId)))
      .get();

    return joinedRoom !== undefined;
  }
}

function createRoomParticipantRowId(roomId: string, playerId: string) {
  return `${roomId}:${playerId}`;
}

function createMatchPlayerRowId(matchId: string, playerId: string) {
  return `${matchId}:${playerId}`;
}

function parseRules(value: string): GameRuleSettings {
  return GameRuleSettingsSchema.parse(JSON.parse(value));
}

function parseCards(value: string): Card[] {
  return CardSchema.array().parse(JSON.parse(value));
}

function createRoomHistoryItem(
  room: RoomHistoryRoomRow,
  matchRows: readonly FinishedMatchSummaryRow[],
): RoomHistoryItem {
  const latestFinishedAt = getLatestFinishedAt(matchRows);

  return {
    id: room.id,
    playerCount: room.playerCount,
    status: room.status,
    createdAt: room.createdAt.getTime(),
    matchCount: matchRows.length,
    latestFinishedAt: latestFinishedAt?.getTime() ?? null,
  };
}

function getLatestFinishedAt(matchRows: readonly FinishedMatchSummaryRow[]) {
  return matchRows.reduce<Date | null>((latest, match) => {
    if (match.finishedAt === null) {
      return latest;
    }

    if (latest === null || match.finishedAt.getTime() > latest.getTime()) {
      return match.finishedAt;
    }

    return latest;
  }, null);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().replace(/\s|-/g, "").toUpperCase();
}

function isEndedRoom(room: RoomState) {
  return room.status === "finished" && room.game === null;
}

export { createRoomRepository };
