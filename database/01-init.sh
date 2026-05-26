#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE grind;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname grind <<EOSQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator WITH LOGIN PASSWORD '${AUTHENTICATOR_PASSWORD}' NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
END
\$\$;
GRANT anon, authenticated TO authenticator;

DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
       CREATE ROLE supabase_auth_admin WITH LOGIN PASSWORD '${AUTH_ADMIN_PASSWORD}' NOINHERIT;
   END IF;
END
\$\$;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname grind <<'EOSQL'

GRANT ALL PRIVILEGES ON DATABASE grind TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;

-- auth schema for GoTrue (migration creates its own tables)
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT CONNECT ON DATABASE grind TO authenticator, anon, authenticated;

-- ============================================================
-- AUTH HELPER
-- Reads sub claim from GoTrue JWT (must match auth.users.id)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json ->> 'sub')::UUID;
$$ LANGUAGE SQL STABLE;

-- Sync: when GoTrue creates a user in auth.users, copy to public.users
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _full_name TEXT;
BEGIN
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  INSERT INTO users (id, username, name, email, avatar_url)
  VALUES (NEW.id, substr(gen_random_uuid()::text, 1, 12), _full_name, NEW.email, NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_from_auth();
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END;
$$;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    email       TEXT UNIQUE,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- user_id IS NULL → system defaults visible to all.
-- user_id IS NOT NULL → user-created custom category.
-- ============================================================
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_categories_user ON categories(user_id);

-- ============================================================
-- HABITS
-- days_of_week: SMALLINT[]  →  {0,2,4} = Sun,Tue,Thu
-- Eliminates need for separate habit_schedules table & JOINs.
-- ============================================================
CREATE TABLE habits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL DEFAULT public.current_user_id() REFERENCES users(id) ON DELETE CASCADE,
    category_id   UUID NOT NULL REFERENCES categories(id),
    name          TEXT NOT NULL,
    days_of_week  SMALLINT[] NOT NULL DEFAULT '{}',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX idx_habits_days_of_week ON habits USING GIN (days_of_week);

-- ============================================================
-- MONTHLY TARGETS
-- Different target count every month. year_month always 1st day.
-- ============================================================
CREATE TABLE monthly_targets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id     UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    year_month   DATE NOT NULL CHECK (EXTRACT(DAY FROM year_month) = 1),
    target_count INT NOT NULL CHECK (target_count > 0),
    UNIQUE(habit_id, year_month)
);

-- ============================================================
-- HABIT LOGS
-- One row per habit per day. user_id denormalized for fast RLS.
-- user_id defaulted to public.current_user_id() so clients never send it.
-- ============================================================
CREATE TABLE habit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL DEFAULT public.current_user_id() REFERENCES users(id) ON DELETE CASCADE,
    completed_date  DATE NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(habit_id, user_id, completed_date)
);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, completed_date);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, completed_date);

-- ============================================================
-- ROW LEVEL SECURITY (full multi-user isolation)
-- ============================================================

-- Categories: system (user_id NULL) visible to all; own categories editable.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY category_read ON categories FOR SELECT
  USING (user_id IS NULL OR user_id = public.current_user_id());
CREATE POLICY category_write ON categories FOR INSERT
  WITH CHECK (user_id = public.current_user_id());
CREATE POLICY category_modify ON categories FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());
CREATE POLICY category_delete ON categories FOR DELETE
  USING (user_id = public.current_user_id());

-- Users: read or update own profile only.
-- INSERT handled by auth trigger (sync_user_from_auth SECURITY DEFINER).
-- DELETE not exposed via API.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_read ON users FOR SELECT
  USING (id = public.current_user_id());
CREATE POLICY user_update ON users FOR UPDATE
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

-- Habits: full CRUD only on own records
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY habit_own ON habits FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- Monthly targets: access only via owned habits
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY target_own ON monthly_targets FOR ALL
  USING (habit_id IN (SELECT id FROM habits WHERE user_id = public.current_user_id()));

-- Habit logs: full CRUD only on own records
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY log_own ON habit_logs FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ============================================================
-- DAILY PROGRESS (no JOIN to extra table, pure array check)
-- ============================================================
CREATE OR REPLACE FUNCTION get_daily_progress(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_scheduled   BIGINT,
    total_completed   BIGINT,
    progress_pct      NUMERIC
) LANGUAGE sql STABLE AS $$
    SELECT
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM p_date)::SMALLINT = ANY(h.days_of_week)),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM p_date)::SMALLINT = ANY(h.days_of_week) AND hl.id IS NOT NULL),
        CASE WHEN COUNT(*) FILTER (WHERE EXTRACT(DOW FROM p_date)::SMALLINT = ANY(h.days_of_week)) > 0
             THEN ROUND(
                 COUNT(*) FILTER (WHERE EXTRACT(DOW FROM p_date)::SMALLINT = ANY(h.days_of_week) AND hl.id IS NOT NULL)::NUMERIC
                 / COUNT(*) FILTER (WHERE EXTRACT(DOW FROM p_date)::SMALLINT = ANY(h.days_of_week))::NUMERIC * 100, 1)
             ELSE 0
        END
    FROM habits h
    LEFT JOIN habit_logs hl
        ON hl.habit_id = h.id AND hl.completed_date = p_date
    WHERE h.user_id = public.current_user_id() AND h.is_active;
$$;

-- ============================================================
-- MONTHLY PROGRESS
-- ============================================================
CREATE OR REPLACE FUNCTION get_monthly_progress(p_year_month DATE)
RETURNS TABLE (
    habit_id      UUID,
    habit_name    TEXT,
    category_name TEXT,
    target        INT,
    completed     BIGINT,
    progress_pct  NUMERIC
) LANGUAGE sql STABLE AS $$
    SELECT
        h.id,
        h.name,
        c.name,
        COALESCE(t.target, 0),
        COUNT(hl.id),
        CASE WHEN t.target > 0
             THEN ROUND(COUNT(hl.id)::NUMERIC / t.target::NUMERIC * 100, 1)
             ELSE 0
        END
    FROM habits h
    JOIN categories c ON c.id = h.category_id
    LEFT JOIN LATERAL (
        SELECT COALESCE(mt.target_count, 0) AS target
        FROM monthly_targets mt
        WHERE mt.habit_id = h.id AND mt.year_month = p_year_month
    ) t ON true
    LEFT JOIN habit_logs hl
        ON hl.habit_id = h.id
        AND hl.completed_date >= p_year_month
        AND hl.completed_date < p_year_month + INTERVAL '1 month'
    WHERE h.user_id = public.current_user_id() AND h.is_active
    GROUP BY h.id, h.name, c.name, t.target;
$$;

-- ============================================================
-- SEED
-- ============================================================
INSERT INTO categories (user_id, name, sort_order) VALUES
    (NULL, 'Productivity', 1),
    (NULL, 'Money',       2),
    (NULL, 'Learning',    3),
    (NULL, 'Grooming',    4),
    (NULL, 'Sleep',       5),
    (NULL, 'Fitness',     6),
    (NULL, 'Social',      7),
    (NULL, 'Faith',       8),
    (NULL, 'Other',       10);

-- ============================================================
-- POSTGREST GRANTS (least privilege)
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE INSERT ON users FROM authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_id()         TO anon;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(date)  TO anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_progress(date) TO anon;

EOSQL
