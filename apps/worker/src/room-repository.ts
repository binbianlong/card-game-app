import { roomParticipants, rooms } from "db";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RoomState } from "schema";

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
    },
  };
}

function createRoomParticipantRowId(roomId: string, playerId: string) {
  return `${roomId}:${playerId}`;
}

export { createRoomRepository };
