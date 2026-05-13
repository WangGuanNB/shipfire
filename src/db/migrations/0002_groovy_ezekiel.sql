CREATE INDEX `feedbacks_user_uuid_idx` ON `feedbacks_shipfire` (`user_uuid`);--> statement-breakpoint
CREATE INDEX `feedbacks_created_at_idx` ON `feedbacks_shipfire` (`created_at`);--> statement-breakpoint
CREATE INDEX `posts_locale_idx` ON `posts_shipfire` (`locale`);--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts_shipfire` (`status`);--> statement-breakpoint
CREATE INDEX `posts_slug_idx` ON `posts_shipfire` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_created_at_idx` ON `posts_shipfire` (`created_at`);--> statement-breakpoint
CREATE INDEX `posts_locale_status_idx` ON `posts_shipfire` (`locale`,`status`);