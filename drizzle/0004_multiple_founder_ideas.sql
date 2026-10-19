DROP INDEX `introductions_sender_profile`;--> statement-breakpoint
ALTER TABLE `introductions` ADD `source_profile_id` text REFERENCES profiles(id);--> statement-breakpoint
ALTER TABLE `introductions` ADD `source_name` text;--> statement-breakpoint
CREATE UNIQUE INDEX `introductions_sender_profile_source` ON `introductions` (`sender`,`profile_id`,coalesce("source_profile_id", ''));--> statement-breakpoint
DROP INDEX `profiles_owner_kind`;--> statement-breakpoint
CREATE INDEX `profiles_owner_kind_lookup` ON `profiles` (`owner`,`kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_investor_owner` ON `profiles` (`owner`) WHERE "profiles"."kind" = 'investor';
