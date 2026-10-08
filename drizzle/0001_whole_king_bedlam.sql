CREATE TABLE `negotiation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`introduction_id` text NOT NULL,
	`version` integer NOT NULL,
	`author` text NOT NULL,
	`author_name` text NOT NULL,
	`amount` integer NOT NULL,
	`terms` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`introduction_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `negotiation_event_version` ON `negotiation_events` (`introduction_id`,`version`);--> statement-breakpoint
CREATE TABLE `negotiations` (
	`introduction_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`author` text NOT NULL,
	`amount` integer NOT NULL,
	`terms` text NOT NULL,
	`status` text NOT NULL,
	`event_id` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`introduction_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`introduction_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_owner_status` ON `notifications` (`owner`,`status`);