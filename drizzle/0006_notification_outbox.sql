CREATE TABLE `notification_dispatch_lease` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_email_controls` (
	`owner` text PRIMARY KEY NOT NULL,
	`consent_version` text NOT NULL,
	`suppressed_email` text DEFAULT '' NOT NULL,
	`suppression_reason` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_email_events` (
	`id` text PRIMARY KEY NOT NULL,
	`notification_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`type` text NOT NULL,
	`event_at` text NOT NULL,
	`received` text NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notification_email_events_notification` ON `notification_email_events` (`notification_id`);--> statement-breakpoint
CREATE TABLE `notification_emails` (
	`notification_id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`provider_id` text DEFAULT '' NOT NULL,
	`recipient` text DEFAULT '' NOT NULL,
	`request_body` text DEFAULT '' NOT NULL,
	`consent_version` text DEFAULT '' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` text DEFAULT '' NOT NULL,
	`next_attempt_at` text DEFAULT '' NOT NULL,
	`lease_until` text DEFAULT '' NOT NULL,
	`lease_token` text DEFAULT '' NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`event_at` text DEFAULT '' NOT NULL,
	`event_id` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_emails_provider` ON `notification_emails` (`provider_id`) WHERE "notification_emails"."provider_id" <> '';--> statement-breakpoint
CREATE INDEX `notification_emails_due` ON `notification_emails` (`state`,`next_attempt_at`);