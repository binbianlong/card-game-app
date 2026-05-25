import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("session_token_unique").on(table.token)],
);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

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

export type UserInsert = typeof user.$inferInsert;
export type SessionInsert = typeof session.$inferInsert;
export type AccountInsert = typeof account.$inferInsert;
export type VerificationInsert = typeof verification.$inferInsert;
export type RoomInsert = typeof rooms.$inferInsert;
export type RoomParticipantInsert = typeof roomParticipants.$inferInsert;
export type UserSelect = typeof user.$inferSelect;
export type SessionSelect = typeof session.$inferSelect;
export type AccountSelect = typeof account.$inferSelect;
export type VerificationSelect = typeof verification.$inferSelect;
export type RoomSelect = typeof rooms.$inferSelect;
export type RoomParticipantSelect = typeof roomParticipants.$inferSelect;
