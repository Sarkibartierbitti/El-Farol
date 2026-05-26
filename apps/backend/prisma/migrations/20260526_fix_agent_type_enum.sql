-- Fix AgentType enum — schema previously held game-status values (copy-paste bug).
-- Convert to the real agent kinds: BUILT_IN, CUSTOM, HUMAN.
-- Safe to run once on existing Supabase/Postgres deployments.

BEGIN;

-- Old enum no longer references real agent types. Rename + recreate.
ALTER TYPE "AgentType" RENAME TO "AgentType_old";

CREATE TYPE "AgentType" AS ENUM ('BUILT_IN', 'CUSTOM', 'HUMAN');

-- Map every old value to BUILT_IN (rows with the bogus values never matched
-- application code anyway; this just satisfies the type change).
ALTER TABLE "agents"
  ALTER COLUMN "type" TYPE "AgentType"
  USING (
    CASE "type"::text
      WHEN 'CUSTOM'  THEN 'CUSTOM'::"AgentType"
      WHEN 'HUMAN'   THEN 'HUMAN'::"AgentType"
      ELSE 'BUILT_IN'::"AgentType"
    END
  );

DROP TYPE "AgentType_old";

COMMIT;
