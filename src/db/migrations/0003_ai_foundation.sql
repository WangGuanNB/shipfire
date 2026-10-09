CREATE TABLE `ai_tasks_shipfire` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`tool_id` text NOT NULL,
	`model_id` text NOT NULL,
	`model_snapshot` text NOT NULL,
	`input` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`credits` integer NOT NULL,
	`provider_task_id` text,
	`artifacts` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`next_poll_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_tasks_request_idx` ON `ai_tasks_shipfire` (`user_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `ai_tasks_user_created_idx` ON `ai_tasks_shipfire` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_tasks_status_poll_idx` ON `ai_tasks_shipfire` (`status`,`next_poll_at`);--> statement-breakpoint
ALTER TABLE `credits_shipfire` ADD `available_at` integer;--> statement-breakpoint
ALTER TABLE `orders_shipfire` ADD `billing_snapshot` text;--> statement-breakpoint
ALTER TABLE `orders_shipfire` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `orders_shipfire` ADD `subscription_status` text;
--> statement-breakpoint
-- Keep the reservation and the task insert in the same SQLite/D1 transaction.
CREATE TRIGGER ai_task_reserve AFTER INSERT ON ai_tasks_shipfire BEGIN
  SELECT CASE WHEN NEW.credits < 0 OR NEW.credits > COALESCE((
    SELECT SUM(credits) FROM credits_shipfire WHERE user_uuid=NEW.user_id
    AND (expired_at IS NULL OR expired_at > unixepoch())
    AND (available_at IS NULL OR available_at <= unixepoch())
  ), 0) THEN RAISE(ABORT, 'insufficient_credits') END;
  INSERT INTO credits_shipfire (trans_no, created_at, user_uuid, trans_type, credits, order_no, expired_at)
  SELECT 'task:' || NEW.id || ':' || COALESCE(expired_at, 'never'), unixepoch(), NEW.user_id,
    'task_reserve', -MIN(balance, NEW.credits - before_balance), '', expired_at
  FROM (
    SELECT expired_at, balance, COALESCE(SUM(balance) OVER (
      ORDER BY COALESCE(expired_at, 253402300799) ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS before_balance
    FROM (
      SELECT expired_at, SUM(credits) AS balance FROM credits_shipfire
      WHERE user_uuid=NEW.user_id AND (expired_at IS NULL OR expired_at > unixepoch())
      AND (available_at IS NULL OR available_at <= unixepoch())
      GROUP BY expired_at HAVING SUM(credits) > 0
    )
  ) WHERE NEW.credits > before_balance;
END;
--> statement-breakpoint
CREATE TRIGGER ai_task_refund AFTER UPDATE OF status ON ai_tasks_shipfire
WHEN NEW.status='failed' AND OLD.status NOT IN ('failed','succeeded') BEGIN
  INSERT OR IGNORE INTO credits_shipfire (trans_no, created_at, user_uuid, trans_type, credits, order_no, expired_at)
  SELECT 'refund:' || trans_no, unixepoch(), user_uuid, 'task_refund', -credits, order_no, expired_at
  FROM credits_shipfire WHERE substr(trans_no,1,length('task:' || NEW.id || ':'))='task:' || NEW.id || ':';
END;
--> statement-breakpoint
CREATE TRIGGER ai_task_settled AFTER UPDATE OF status ON ai_tasks_shipfire
WHEN NEW.status='succeeded' AND OLD.status NOT IN ('failed','succeeded') BEGIN
  UPDATE credits_shipfire SET trans_type='tool_usage'
  WHERE substr(trans_no,1,length('task:' || NEW.id || ':'))='task:' || NEW.id || ':';
END;
--> statement-breakpoint
CREATE TRIGGER ai_task_terminal BEFORE UPDATE OF status ON ai_tasks_shipfire
WHEN OLD.status IN ('failed','succeeded') AND NEW.status != OLD.status BEGIN
  SELECT RAISE(ABORT, 'terminal_task');
END;
