CREATE TABLE `rooms` (
  `id` text PRIMARY KEY NOT NULL,
  `invite_code` text NOT NULL,
  `host_user_id` text,
  `host_player_id` text NOT NULL,
  `player_count` integer NOT NULL,
  `status` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `rooms_invite_code_unique` ON `rooms` (`invite_code`);

CREATE TABLE `room_participants` (
  `id` text PRIMARY KEY NOT NULL,
  `room_id` text NOT NULL,
  `player_id` text NOT NULL,
  `user_id` text,
  `display_name` text NOT NULL,
  `kind` text NOT NULL,
  `connected` integer NOT NULL,
  `ready` integer NOT NULL,
  `joined_at` integer NOT NULL,
  `left_at` integer,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `room_participants_room_player_unique`
  ON `room_participants` (`room_id`, `player_id`);
