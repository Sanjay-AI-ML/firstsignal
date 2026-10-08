CREATE TABLE `introductions` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text,
	`profile_id` text NOT NULL,
	`target_name` text NOT NULL,
	`sender_name` text NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `introductions_sender_profile` ON `introductions` (`sender`,`profile_id`);--> statement-breakpoint
CREATE INDEX `introductions_recipient` ON `introductions` (`recipient`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`introduction_id` text NOT NULL,
	`sender` text NOT NULL,
	`sender_name` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`introduction_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_introduction_created` ON `messages` (`introduction_id`,`created`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`listed` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_owner_kind` ON `profiles` (`owner`,`kind`);--> statement-breakpoint
CREATE INDEX `profiles_listed` ON `profiles` (`listed`);--> statement-breakpoint
CREATE TABLE `saves` (
	`owner` text NOT NULL,
	`profile_id` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `profile_id`)
);
