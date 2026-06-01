CREATE TABLE `matches` (
  `id` text PRIMARY KEY NOT NULL,
  `room_id` text NOT NULL,
  `invite_code` text NOT NULL,
  `player_count` integer NOT NULL,
  `status` text NOT NULL,
  `rules_json` text NOT NULL,
  `started_at` integer NOT NULL,
  `finished_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `match_players` (
  `id` text PRIMARY KEY NOT NULL,
  `match_id` text NOT NULL,
  `room_id` text NOT NULL,
  `player_id` text NOT NULL,
  `display_name` text NOT NULL,
  `kind` text NOT NULL,
  `rank` integer,
  `initial_hand_json` text NOT NULL,
  `remaining_hand_json` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `match_players_match_player_unique`
  ON `match_players` (`match_id`, `player_id`);
