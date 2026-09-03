import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/config";

export type PersonalFeedRecord = {
  userId: number;
  login: string;
  campusId: number;
  revokedAt: Date | null;
};

function sql() {
  return neon(env("DATABASE_URL"));
}

export async function rotatePersonalFeed(userId: number, login: string, campusId: number, tokenHash: string): Promise<void> {
  await sql()`
    WITH revoked AS (
      UPDATE personal_feeds SET revoked_at = now(), updated_at = now()
      WHERE forty_two_user_id = ${userId} AND revoked_at IS NULL
    )
    INSERT INTO personal_feeds (forty_two_user_id, login, primary_campus_id, token_hash)
    VALUES (${userId}, ${login}, ${campusId}, ${tokenHash})
  `;
}

export async function revokePersonalFeed(userId: number): Promise<void> {
  await sql()`
    UPDATE personal_feeds SET revoked_at = now(), updated_at = now()
    WHERE forty_two_user_id = ${userId} AND revoked_at IS NULL
  `;
}

export async function lookupPersonalFeed(tokenHash: string): Promise<PersonalFeedRecord | null> {
  const rows = await sql()`
    SELECT forty_two_user_id, login, primary_campus_id, revoked_at
    FROM personal_feeds WHERE token_hash = ${tokenHash} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    userId: Number(row.forty_two_user_id),
    login: String(row.login),
    campusId: Number(row.primary_campus_id),
    revokedAt: row.revoked_at ? new Date(String(row.revoked_at)) : null,
  };
}

export async function touchPersonalFeed(tokenHash: string): Promise<void> {
  await sql()`UPDATE personal_feeds SET last_used_at = now() WHERE token_hash = ${tokenHash}`;
}
