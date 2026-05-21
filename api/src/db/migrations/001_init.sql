CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level         INT NOT NULL DEFAULT 1,
  xp            INT NOT NULL DEFAULT 0,
  gold          INT NOT NULL DEFAULT 100,
  equipped      JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS users_xp_desc ON users (xp DESC);

CREATE TABLE IF NOT EXISTS user_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_items_user_idx ON user_items (user_id);

CREATE TABLE IF NOT EXISTS runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dungeon_id       TEXT NOT NULL,
  seed             BIGINT NOT NULL,
  current_node_id  TEXT NOT NULL,
  visited          JSONB NOT NULL DEFAULT '[]'::jsonb,
  map              JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS runs_user_active_idx
  ON runs (user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS fights (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                   UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enemy_id                 TEXT NOT NULL,
  node_id                  TEXT,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at                 TIMESTAMPTZ,
  result                   TEXT,
  player_max_dps           REAL NOT NULL,
  player_max_hp            INT NOT NULL,
  enemy_hp                 INT NOT NULL,
  is_elite                 BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS fights_user_idx ON fights (user_id);

CREATE TABLE IF NOT EXISTS friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS friendships_a_idx ON friendships (user_a);
CREATE INDEX IF NOT EXISTS friendships_b_idx ON friendships (user_b);

CREATE TABLE IF NOT EXISTS shop_rolls (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items      JSONB NOT NULL,
  rolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
