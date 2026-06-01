import { matchPlayers, matches, roomParticipants, rooms } from "db";
import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  CardSchema,
  GameRuleSettingsSchema,
  type Card,
  type GameRuleSettings,
  type MatchHistoryItem,
  type RoomState,
} from "schema";

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

    async saveRoomMetadata(room: RoomState) {
      const now = new Date();

      await db
        .insert(rooms)
        .values({
          id: room.id,
          inviteCode: room.inviteCode,
          hostPlayerId: room.hostPlayerId,
          playerCount: room.playerCount,
          status: room.status,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: rooms.id,
          set: {
            inviteCode: room.inviteCode,
            hostPlayerId: room.hostPlayerId,
            playerCount: room.playerCount,
            status: room.status,
            updatedAt: now,
          },
        });

      await Promise.all(
        room.participants.map((participant) =>
          db
            .insert(roomParticipants)
            .values({
              id: createRoomParticipantRowId(room.id, participant.id),
              roomId: room.id,
              playerId: participant.id,
              displayName: participant.name,
              kind: participant.kind,
              connected: participant.connected,
              ready: participant.ready,
              joinedAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: roomParticipants.id,
              set: {
                displayName: participant.name,
                kind: participant.kind,
                connected: participant.connected,
                ready: participant.ready,
                leftAt: participant.connected ? null : now,
                updatedAt: now,
              },
            }),
        ),
      );

      if (room.game?.phase === "finished") {
        await saveMatchSnapshot(room, now);
      }
    },

    async listMatchHistory(limit = 20): Promise<readonly MatchHistoryItem[]> {
      const matchRows = await db
        .select()
        .from(matches)
        .where(eq(matches.status, "finished"))
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
          inviteCode: match.inviteCode,
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

export { createRoomRepository };
