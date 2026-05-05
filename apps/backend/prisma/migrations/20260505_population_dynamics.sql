-- Population dynamics migration for Supabase/Postgres
-- Safe to run once in the Supabase SQL editor.

BEGIN;

ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "population_dynamics" JSONB;

ALTER TABLE "rounds"
  ADD COLUMN IF NOT EXISTS "active_agents_start" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active_agents_end" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "arrivals" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "departures" INTEGER NOT NULL DEFAULT 0;

COMMIT;
