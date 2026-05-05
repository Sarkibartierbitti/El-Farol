-- El Farol schema for Supabase (run in SQL Editor)
-- Run each block separately if you get errors, or run all at once

-- Enums
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AgentType" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BuiltInAgentType" AS ENUM ('RANDOM', 'THRESHOLD', 'MOVING_AVERAGE', 'ADAPTIVE', 'CONTRARIAN', 'TREND_FOLLOWER', 'LOYAL', 'REGRET_MINIMIZING');

-- Games
CREATE TABLE "games" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "total_rounds" INTEGER NOT NULL,
  "capacity_percent" DOUBLE PRECISION,
  "total_agents" INTEGER NOT NULL,
  "benefit_rules" JSONB NOT NULL,
  "population_dynamics" JSONB,
  "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
  "current_round" INTEGER NOT NULL DEFAULT 0,
  "seed" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- Agents
CREATE TABLE "agents" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AgentType" NOT NULL,
  "built_in_type" "BuiltInAgentType",
  "custom_code" TEXT,
  "config" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_by" TEXT,

  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- Game agents (join table)
CREATE TABLE "game_agents" (
  "id" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "attendance_count" INTEGER NOT NULL DEFAULT 0,
  "win_count" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "game_agents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "game_agents" ADD CONSTRAINT "game_agents_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_agents" ADD CONSTRAINT "game_agents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "game_agents_game_id_agent_id_key" ON "game_agents"("game_id", "agent_id");

-- Rounds
CREATE TABLE "rounds" (
  "id" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "round_number" INTEGER NOT NULL,
  "attendance" INTEGER NOT NULL,
  "capacity" INTEGER NOT NULL,
  "active_agents_start" INTEGER NOT NULL DEFAULT 0,
  "active_agents_end" INTEGER NOT NULL DEFAULT 0,
  "arrivals" INTEGER NOT NULL DEFAULT 0,
  "departures" INTEGER NOT NULL DEFAULT 0,
  "was_overcrowded" BOOLEAN NOT NULL,
  "attendee_benefit" DOUBLE PRECISION NOT NULL,
  "stayer_benefit" DOUBLE PRECISION NOT NULL,
  "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "rounds" ADD CONSTRAINT "rounds_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "rounds_game_id_round_number_key" ON "rounds"("game_id", "round_number");

-- Decisions
CREATE TABLE "decisions" (
  "id" TEXT NOT NULL,
  "round_id" TEXT NOT NULL,
  "game_agent_id" TEXT NOT NULL,
  "went_to_bar" BOOLEAN NOT NULL,
  "prediction" INTEGER,
  "confidence" DOUBLE PRECISION,
  "benefit" DOUBLE PRECISION NOT NULL DEFAULT 0,

  CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "decisions" ADD CONSTRAINT "decisions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_game_agent_id_fkey" FOREIGN KEY ("game_agent_id") REFERENCES "game_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "decisions_round_id_game_agent_id_key" ON "decisions"("round_id", "game_agent_id");

-- Telegram users
CREATE TABLE "telegram_users" (
  "id" TEXT NOT NULL,
  "username" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "games_played" INTEGER NOT NULL DEFAULT 0,
  "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "telegram_users_pkey" PRIMARY KEY ("id")
);

-- Enable updated_at trigger for games and agents (Prisma expects these)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON "games"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON "agents"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
