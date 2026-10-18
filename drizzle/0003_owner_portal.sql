CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`previous_state` text NOT NULL,
	`next_state` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created` ON `admin_audit` (`created`);--> statement-breakpoint
CREATE TABLE `profile_moderation` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`version` integer NOT NULL,
	`event_id` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `member_reports` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `member_reports` ADD `updated` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_reports` ADD `operator_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_reports` ADD `last_admin_event` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `member_reports_status_created` ON `member_reports` (`status`,`created`);