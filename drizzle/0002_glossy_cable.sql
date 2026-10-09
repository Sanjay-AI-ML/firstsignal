CREATE TABLE `connection_next_steps` (
	`owner` text NOT NULL,
	`introduction_id` text NOT NULL,
	`note` text NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `introduction_id`),
	FOREIGN KEY (`introduction_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `member_blocks` (
	`owner` text NOT NULL,
	`target_owner` text NOT NULL,
	`profile_id` text NOT NULL,
	`target_name` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `target_owner`)
);
--> statement-breakpoint
CREATE INDEX `member_blocks_target` ON `member_blocks` (`target_owner`);--> statement-breakpoint
CREATE TABLE `member_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`target_owner` text NOT NULL,
	`profile_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `member_reports_owner_created` ON `member_reports` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `progress_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `progress_updates_profile_created` ON `progress_updates` (`profile_id`,`created`);