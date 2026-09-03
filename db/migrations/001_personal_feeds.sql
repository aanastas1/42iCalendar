CREATE TABLE IF NOT EXISTS personal_feeds (
  id BIGSERIAL PRIMARY KEY,
  forty_two_user_id BIGINT NOT NULL,
  login TEXT NOT NULL,
  primary_campus_id INTEGER NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  token_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS personal_feeds_one_active_per_user
  ON personal_feeds (forty_two_user_id) WHERE revoked_at IS NULL;
