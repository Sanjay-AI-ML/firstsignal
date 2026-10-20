CREATE TABLE IF NOT EXISTS `profile_versions` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`last_operation` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`operation_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_id` text DEFAULT '' NOT NULL,
	`response` text NOT NULL,
	`payload_hash` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idempotency_keys_owner_created` ON `idempotency_keys` (`owner`,`created`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `daily_quotas` (
	`owner` text NOT NULL,
	`quota_key` text NOT NULL,
	`date_bucket` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `quota_key`, `date_bucket`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversation_read_positions` (
	`introduction_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_message_id` text DEFAULT '' NOT NULL,
	`last_read_at` text NOT NULL,
	PRIMARY KEY(`introduction_id`, `user_id`),
	FOREIGN KEY (`introduction_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `idea_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`version` integer NOT NULL,
	`data` text NOT NULL,
	`listed` integer DEFAULT 0 NOT NULL,
	`change_summary` text NOT NULL,
	`created` text NOT NULL,
	`author` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idea_revisions_profile_version` ON `idea_revisions` (`profile_id`, `version`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`query` text NOT NULL,
	`filters` text NOT NULL,
	`alerts_enabled` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `saved_searches_owner_created` ON `saved_searches` (`owner`, `created`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account_closures` (
	`owner` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text NOT NULL,
	`retention_until` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `profiles_listed_updated` ON `profiles` (`listed`, `updated`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `introductions_sender_created` ON `introductions` (`sender`, `created`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `saves_owner_created` ON `saves` (`owner`, `created`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `messages_introduction_created_id` ON `messages` (`introduction_id`,`created`,`id`);
--> statement-breakpoint
INSERT INTO profile_versions(profile_id,version,last_operation,updated) SELECT id,1,'',updated FROM profiles WHERE 1 ON CONFLICT(profile_id) DO NOTHING;
