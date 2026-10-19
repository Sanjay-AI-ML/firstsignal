CREATE TABLE `idea_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`plan` text NOT NULL,
	`result` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`shared` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`started_at` text DEFAULT '' NOT NULL,
	`completed_at` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idea_experiments_profile_created` ON `idea_experiments` (`profile_id`,`created`);