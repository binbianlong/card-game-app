import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const rooms = sqliteTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    inviteCode: text("invite_code").notNull(),
    hostUserId: text("host_user_id"),
    hostPlayerId: text("host_player_id").notNull(),
    playerCount: integer("player_count").notNull(),
    status: text("status", { enum: ["waiting", "playing", "finished"] }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("rooms_invite_code_unique").on(table.inviteCode)],
);

export const roomParticipants = sqliteTable(
  "room_participants",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    playerId: text("player_id").notNull(),
    userId: text("user_id"),
    displayName: text("display_name").notNull(),
    kind: text("kind", { enum: ["host", "guest", "cpu"] }).notNull(),
    connected: integer("connected", { mode: "boolean" }).notNull(),
    ready: integer("ready", { mode: "boolean" }).notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
    leftAt: integer("left_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("room_participants_room_player_unique").on(table.roomId, table.playerId)],
);

export type RoomInsert = typeof rooms.$inferInsert;
export type RoomParticipantInsert = typeof roomParticipants.$inferInsert;
export type RoomSelect = typeof rooms.$inferSelect;
export type RoomParticipantSelect = typeof roomParticipants.$inferSelect;
