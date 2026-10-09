import { sql } from "drizzle-orm";

/** One atomic statement, oldest expiry first. Also respects scheduled future grants. */
export function debitCreditsSql(userId: string, amount: number, key: string, type: string) {
  return sql`INSERT INTO credits_shipfire (trans_no,created_at,user_uuid,trans_type,credits,order_no,expired_at)
    SELECT ${key} || ':' || COALESCE(expired_at,'never'),unixepoch(),${userId},${type},-MIN(balance,${amount}-before_balance),'',expired_at
    FROM (
      SELECT expired_at,balance,COALESCE(SUM(balance) OVER (ORDER BY COALESCE(expired_at,253402300799) ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS before_balance
      FROM (SELECT expired_at,SUM(credits) AS balance FROM credits_shipfire WHERE user_uuid=${userId}
        AND (expired_at IS NULL OR expired_at > unixepoch()) AND (available_at IS NULL OR available_at <= unixepoch())
        GROUP BY expired_at HAVING SUM(credits)>0)
    ) WHERE ${amount}>before_balance AND ${amount}<=(SELECT COALESCE(SUM(credits),0) FROM credits_shipfire WHERE user_uuid=${userId}
      AND (expired_at IS NULL OR expired_at>unixepoch()) AND (available_at IS NULL OR available_at<=unixepoch()))
    ON CONFLICT DO NOTHING`;
}
