-- PostgreSQL 15+; custom integrity rules below are part of this migration.
BEGIN;
-- CreateEnum
CREATE TYPE "stage_kind" AS ENUM ('LEAGUE', 'GROUP', 'KNOCKOUT');

-- CreateEnum
CREATE TYPE "player_position" AS ENUM ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD');

-- CreateEnum
CREATE TYPE "manager_role" AS ENUM ('HEAD_COACH', 'INTERIM', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "match_period" AS ENUM ('FIRST_HALF', 'SECOND_HALF', 'EXTRA_FIRST_HALF', 'EXTRA_SECOND_HALF', 'PENALTY_SHOOTOUT');

-- CreateEnum
CREATE TYPE "score_period" AS ENUM ('FIRST_HALF', 'REGULATION', 'EXTRA_TIME', 'PENALTY_SHOOTOUT');

-- CreateEnum
CREATE TYPE "data_coverage" AS ENUM ('UNKNOWN', 'NOT_AVAILABLE', 'PARTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "match_event_kind" AS ENUM ('GOAL', 'OWN_GOAL', 'PENALTY_GOAL', 'PENALTY_MISSED', 'YELLOW_CARD', 'SECOND_YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'VAR', 'PERIOD_START', 'PERIOD_END', 'OTHER');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'DISALLOWED', 'RETRACTED');

-- CreateEnum
CREATE TYPE "lineup_status" AS ENUM ('UNKNOWN', 'PROVISIONAL', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "lineup_role" AS ENUM ('STARTER', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "form_result" AS ENUM ('W', 'D', 'L');

-- CreateEnum
CREATE TYPE "table_variant" AS ENUM ('OVERALL', 'HOME', 'AWAY');

-- CreateEnum
CREATE TYPE "statistic_scope" AS ENUM ('MATCH', 'SEASON');

-- CreateEnum
CREATE TYPE "statistic_period" AS ENUM ('TOTAL', 'FIRST_HALF', 'SECOND_HALF', 'EXTRA_TIME', 'PENALTY_SHOOTOUT');

-- CreateEnum
CREATE TYPE "statistic_value_type" AS ENUM ('COUNT', 'DECIMAL', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "statistic_aggregation" AS ENUM ('SUM', 'RATIO', 'AVERAGE', 'LAST');

-- CreateEnum
CREATE TYPE "tie_slot" AS ENUM ('FIRST', 'SECOND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "match_status" ADD VALUE 'halftime';
ALTER TYPE "match_status" ADD VALUE 'abandoned';

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "flag_url" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "short_name" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "seasons" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "founded_year" INTEGER,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "venue_id" UUID;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "added_minute" INTEGER,
ADD COLUMN     "events_coverage" "data_coverage" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "group_id" UUID,
ADD COLUMN     "leg_number" INTEGER,
ADD COLUMN     "lineups_coverage" "data_coverage" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "observed_at" TIMESTAMPTZ(6),
ADD COLUMN     "period" "match_period",
ADD COLUMN     "public_id" BIGSERIAL NOT NULL,
ADD COLUMN     "stage_id" UUID,
ADD COLUMN     "statistics_coverage" "data_coverage" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "tie_id" UUID,
ADD COLUMN     "venue_id" UUID;

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "is_development" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "external_references" ADD COLUMN     "assignment_id" UUID,
ADD COLUMN     "country_id" UUID,
ADD COLUMN     "group_id" UUID,
ADD COLUMN     "lineup_id" UUID,
ADD COLUMN     "lineup_player_id" UUID,
ADD COLUMN     "manager_id" UUID,
ADD COLUMN     "match_event_id" UUID,
ADD COLUMN     "player_id" UUID,
ADD COLUMN     "player_statistic_id" UUID,
ADD COLUMN     "registration_id" UUID,
ADD COLUMN     "score_period_id" UUID,
ADD COLUMN     "stage_id" UUID,
ADD COLUMN     "standing_id" UUID,
ADD COLUMN     "team_statistic_id" UUID,
ADD COLUMN     "tie_id" UUID,
ADD COLUMN     "venue_id" UUID;

-- CreateTable
CREATE TABLE "competition_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "stage_kind" NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "competition_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stage_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "competition_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country_id" UUID,
    "capacity" INTEGER,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "date_of_birth" DATE,
    "country_id" UUID,
    "position" "player_position",
    "portrait_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "country_id" UUID,
    "portrait_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_player_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,
    "shirt_number" INTEGER,
    "is_loan" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "team_player_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_manager_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "role" "manager_role" NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,

    CONSTRAINT "team_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knockout_ties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "round_name" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "first_team_id" UUID,
    "second_team_id" UUID,
    "winner_team_id" UUID,
    "first_aggregate" INTEGER,
    "second_aggregate" INTEGER,
    "next_tie_id" UUID,
    "next_slot" "tie_slot",

    CONSTRAINT "knockout_ties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_score_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "period" "score_period" NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,

    CONSTRAINT "match_score_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "team_id" UUID,
    "player_id" UUID,
    "manager_id" UUID,
    "assist_player_id" UUID,
    "player_in_id" UUID,
    "player_out_id" UUID,
    "related_event_id" UUID,
    "kind" "match_event_kind" NOT NULL,
    "status" "event_status" NOT NULL DEFAULT 'CONFIRMED',
    "period" "match_period",
    "minute" INTEGER,
    "added_minute" INTEGER,
    "sequence" INTEGER NOT NULL,
    "detail" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "observed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "manager_id" UUID,
    "formation" TEXT,
    "status" "lineup_status" NOT NULL DEFAULT 'UNKNOWN',
    "observed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineup_players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lineup_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "role" "lineup_role" NOT NULL,
    "position" "player_position",
    "shirt_number" INTEGER,
    "captain" BOOLEAN NOT NULL DEFAULT false,
    "position_x" DECIMAL(5,2),
    "position_y" DECIMAL(5,2),

    CONSTRAINT "lineup_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "stage_id" UUID,
    "group_id" UUID,
    "team_id" UUID NOT NULL,
    "variant" "table_variant" NOT NULL DEFAULT 'OVERALL',
    "position" INTEGER,
    "played" INTEGER,
    "won" INTEGER,
    "drawn" INTEGER,
    "lost" INTEGER,
    "goals_for" INTEGER,
    "goals_against" INTEGER,
    "goal_difference" INTEGER,
    "points" DECIMAL(8,2),
    "points_adjustment" DECIMAL(8,2),
    "form" "form_result"[] DEFAULT ARRAY[]::"form_result"[],
    "form_coverage" "data_coverage" NOT NULL DEFAULT 'UNKNOWN',
    "observed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "value_type" "statistic_value_type" NOT NULL,
    "aggregation" "statistic_aggregation" NOT NULL,

    CONSTRAINT "statistic_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic_contexts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" "statistic_scope" NOT NULL,
    "season_id" UUID NOT NULL,
    "match_id" UUID,
    "stage_id" UUID,
    "group_id" UUID,
    "period" "statistic_period" NOT NULL DEFAULT 'TOTAL',
    "split" "table_variant" NOT NULL DEFAULT 'OVERALL',

    CONSTRAINT "statistic_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_statistics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "context_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "value_type" "statistic_value_type" NOT NULL,
    "integer_value" INTEGER,
    "decimal_value" DECIMAL(16,4),
    "observed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_statistics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "context_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "value_type" "statistic_value_type" NOT NULL,
    "integer_value" INTEGER,
    "decimal_value" DECIMAL(16,4),
    "observed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_statistics_pkey" PRIMARY KEY ("id")
);

-- Preserve existing IDs and give legacy records collision-free URL keys.
UPDATE countries SET slug = 'country-' || replace(id::text, '-', '') WHERE slug IS NULL;
ALTER TABLE countries ALTER COLUMN slug SET NOT NULL;
UPDATE seasons SET slug = 'season-' || replace(id::text, '-', '') WHERE slug IS NULL;
ALTER TABLE seasons ALTER COLUMN slug SET NOT NULL;
-- Foundation matches did not require explicit competition participation.
INSERT INTO season_teams (season_id, team_id)
SELECT season_id, home_team_id FROM matches
UNION SELECT season_id, away_team_id FROM matches
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "stage_season_order_idx" ON "competition_stages"("season_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "stage_season_slug" ON "competition_stages"("season_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "stage_id_season" ON "competition_stages"("id", "season_id");

-- CreateIndex
CREATE INDEX "group_stage_order_idx" ON "competition_groups"("stage_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "group_stage_slug" ON "competition_groups"("stage_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "group_id_stage_season" ON "competition_groups"("id", "stage_id", "season_id");

-- CreateIndex
CREATE INDEX "venue_country_city_idx" ON "venues"("country_id", "city");

-- CreateIndex
CREATE UNIQUE INDEX "players_slug_key" ON "players"("slug");

-- CreateIndex
CREATE INDEX "player_country_position_idx" ON "players"("country_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "managers_slug_key" ON "managers"("slug");

-- CreateIndex
CREATE INDEX "manager_country_idx" ON "managers"("country_id");

-- CreateIndex
CREATE INDEX "registration_team_dates_idx" ON "team_player_registrations"("team_id", "ends_on", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "registration_identity" ON "team_player_registrations"("player_id", "team_id", "starts_on", "ends_on") NULLS NOT DISTINCT;

-- CreateIndex
CREATE INDEX "manager_assignment_team_dates_idx" ON "team_manager_assignments"("team_id", "ends_on", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "manager_assignment_identity" ON "team_manager_assignments"("manager_id", "team_id", "role", "starts_on", "ends_on") NULLS NOT DISTINCT;

-- CreateIndex
CREATE INDEX "tie_first_team_idx" ON "knockout_ties"("season_id", "first_team_id");

-- CreateIndex
CREATE INDEX "tie_second_team_idx" ON "knockout_ties"("season_id", "second_team_id");

-- CreateIndex
CREATE INDEX "tie_winner_idx" ON "knockout_ties"("season_id", "winner_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "tie_stage_round_slot" ON "knockout_ties"("stage_id", "round_number", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "tie_id_stage_season" ON "knockout_ties"("id", "stage_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "tie_progression_slot" ON "knockout_ties"("next_tie_id", "next_slot");

-- CreateIndex
CREATE UNIQUE INDEX "match_score_period_identity" ON "match_score_periods"("match_id", "period");

-- CreateIndex
CREATE INDEX "event_match_team_idx" ON "match_events"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "event_player_idx" ON "match_events"("player_id");

-- CreateIndex
CREATE INDEX "event_assist_idx" ON "match_events"("assist_player_id");

-- CreateIndex
CREATE INDEX "event_player_in_idx" ON "match_events"("player_in_id");

-- CreateIndex
CREATE INDEX "event_player_out_idx" ON "match_events"("player_out_id");

-- CreateIndex
CREATE INDEX "event_manager_idx" ON "match_events"("manager_id");

-- CreateIndex
CREATE INDEX "event_correction_idx" ON "match_events"("related_event_id", "match_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_match_sequence" ON "match_events"("match_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "event_id_match" ON "match_events"("id", "match_id");

-- CreateIndex
CREATE INDEX "lineup_team_idx" ON "lineups"("team_id");

-- CreateIndex
CREATE INDEX "lineup_manager_idx" ON "lineups"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "lineup_match_team" ON "lineups"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "lineup_player_history_idx" ON "lineup_players"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "lineup_player_identity" ON "lineup_players"("lineup_id", "player_id");

-- CreateIndex
CREATE INDEX "standing_table_position_idx" ON "standings"("season_id", "stage_id", "group_id", "variant", "position");

-- CreateIndex
CREATE INDEX "standing_team_season_idx" ON "standings"("team_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "standing_identity" ON "standings"("season_id", "stage_id", "group_id", "variant", "team_id") NULLS NOT DISTINCT;

-- CreateIndex
CREATE UNIQUE INDEX "statistic_definitions_key_key" ON "statistic_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "stat_definition_id_type" ON "statistic_definitions"("id", "value_type");

-- CreateIndex
CREATE INDEX "stat_context_match_idx" ON "statistic_contexts"("match_id", "season_id");

-- CreateIndex
CREATE INDEX "stat_context_stage_group_idx" ON "statistic_contexts"("stage_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "stat_context_id_season" ON "statistic_contexts"("id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "stat_context_identity" ON "statistic_contexts"("season_id", "scope", "match_id", "stage_id", "group_id", "period", "split") NULLS NOT DISTINCT;

-- CreateIndex
CREATE INDEX "team_stat_team_season_idx" ON "team_statistics"("team_id", "season_id");

-- CreateIndex
CREATE INDEX "team_stat_leaderboard_idx" ON "team_statistics"("context_id", "definition_id", "integer_value");

-- CreateIndex
CREATE INDEX "team_stat_definition_idx" ON "team_statistics"("definition_id", "value_type");

-- CreateIndex
CREATE UNIQUE INDEX "team_stat_identity" ON "team_statistics"("context_id", "team_id", "definition_id");

-- CreateIndex
CREATE INDEX "player_stat_player_season_idx" ON "player_statistics"("player_id", "season_id");

-- CreateIndex
CREATE INDEX "player_stat_team_season_idx" ON "player_statistics"("team_id", "season_id");

-- CreateIndex
CREATE INDEX "player_stat_leaderboard_idx" ON "player_statistics"("context_id", "definition_id", "integer_value");

-- CreateIndex
CREATE INDEX "player_stat_definition_idx" ON "player_statistics"("definition_id", "value_type");

-- CreateIndex
CREATE UNIQUE INDEX "player_stat_identity" ON "player_statistics"("context_id", "player_id", "team_id", "definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_slug_unique" ON "countries"("slug");

-- CreateIndex
CREATE INDEX "competition_country_kind_idx" ON "competitions"("country_id", "kind");

-- CreateIndex
CREATE INDEX "season_competition_start_idx" ON "seasons"("competition_id", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "season_competition_slug" ON "seasons"("competition_id", "slug");

-- CreateIndex
CREATE INDEX "team_country_kind_idx" ON "teams"("country_id", "kind");

-- CreateIndex
CREATE INDEX "team_venue_idx" ON "teams"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_public_id_unique" ON "matches"("public_id");

-- CreateIndex
CREATE INDEX "match_date_cursor_idx" ON "matches"("kickoff_at", "id");

-- CreateIndex
CREATE INDEX "match_status_kickoff_idx" ON "matches"("status", "kickoff_at");

-- CreateIndex
CREATE INDEX "match_head_to_head_idx" ON "matches"("home_team_id", "away_team_id", "kickoff_at");

-- CreateIndex
CREATE INDEX "match_stage_group_date_idx" ON "matches"("stage_id", "group_id", "kickoff_at");

-- CreateIndex
CREATE INDEX "match_venue_idx" ON "matches"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_id_season" ON "matches"("id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_tie_leg" ON "matches"("tie_id", "leg_number");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_country" ON "external_references"("provider_id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_player" ON "external_references"("provider_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_manager" ON "external_references"("provider_id", "manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_venue" ON "external_references"("provider_id", "venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_match_event" ON "external_references"("provider_id", "match_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_lineup" ON "external_references"("provider_id", "lineup_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_lineup_player" ON "external_references"("provider_id", "lineup_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_standing" ON "external_references"("provider_id", "standing_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_team_statistic" ON "external_references"("provider_id", "team_statistic_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_player_statistic" ON "external_references"("provider_id", "player_statistic_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_stage" ON "external_references"("provider_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_group" ON "external_references"("provider_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_tie" ON "external_references"("provider_id", "tie_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_registration" ON "external_references"("provider_id", "registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_assignment" ON "external_references"("provider_id", "assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "reference_provider_score_period" ON "external_references"("provider_id", "score_period_id");

-- AddForeignKey
ALTER TABLE "competition_stages" ADD CONSTRAINT "competition_stages_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competition_groups" ADD CONSTRAINT "competition_groups_stage_id_season_id_fkey" FOREIGN KEY ("stage_id", "season_id") REFERENCES "competition_stages"("id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "managers" ADD CONSTRAINT "managers_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_player_registrations" ADD CONSTRAINT "team_player_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_player_registrations" ADD CONSTRAINT "team_player_registrations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_manager_assignments" ADD CONSTRAINT "team_manager_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_manager_assignments" ADD CONSTRAINT "team_manager_assignments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knockout_ties" ADD CONSTRAINT "knockout_ties_stage_id_season_id_fkey" FOREIGN KEY ("stage_id", "season_id") REFERENCES "competition_stages"("id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knockout_ties" ADD CONSTRAINT "knockout_ties_season_id_first_team_id_fkey" FOREIGN KEY ("season_id", "first_team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knockout_ties" ADD CONSTRAINT "knockout_ties_season_id_second_team_id_fkey" FOREIGN KEY ("season_id", "second_team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knockout_ties" ADD CONSTRAINT "knockout_ties_season_id_winner_team_id_fkey" FOREIGN KEY ("season_id", "winner_team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knockout_ties" ADD CONSTRAINT "knockout_ties_next_tie_id_stage_id_season_id_fkey" FOREIGN KEY ("next_tie_id", "stage_id", "season_id") REFERENCES "knockout_ties"("id", "stage_id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "match_home_participation_fk" FOREIGN KEY ("season_id", "home_team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "match_away_participation_fk" FOREIGN KEY ("season_id", "away_team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_season_id_fkey" FOREIGN KEY ("stage_id", "season_id") REFERENCES "competition_stages"("id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_stage_id_season_id_fkey" FOREIGN KEY ("group_id", "stage_id", "season_id") REFERENCES "competition_groups"("id", "stage_id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tie_id_stage_id_season_id_fkey" FOREIGN KEY ("tie_id", "stage_id", "season_id") REFERENCES "knockout_ties"("id", "stage_id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_score_periods" ADD CONSTRAINT "match_score_periods_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_assist_player_id_fkey" FOREIGN KEY ("assist_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_in_id_fkey" FOREIGN KEY ("player_in_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_out_id_fkey" FOREIGN KEY ("player_out_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_related_event_id_match_id_fkey" FOREIGN KEY ("related_event_id", "match_id") REFERENCES "match_events"("id", "match_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_lineup_id_fkey" FOREIGN KEY ("lineup_id") REFERENCES "lineups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_stage_id_season_id_fkey" FOREIGN KEY ("stage_id", "season_id") REFERENCES "competition_stages"("id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_group_id_stage_id_season_id_fkey" FOREIGN KEY ("group_id", "stage_id", "season_id") REFERENCES "competition_groups"("id", "stage_id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_team_id_fkey" FOREIGN KEY ("season_id", "team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistic_contexts" ADD CONSTRAINT "statistic_contexts_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistic_contexts" ADD CONSTRAINT "statistic_contexts_match_id_season_id_fkey" FOREIGN KEY ("match_id", "season_id") REFERENCES "matches"("id", "season_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistic_contexts" ADD CONSTRAINT "statistic_contexts_stage_id_season_id_fkey" FOREIGN KEY ("stage_id", "season_id") REFERENCES "competition_stages"("id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistic_contexts" ADD CONSTRAINT "statistic_contexts_group_id_stage_id_season_id_fkey" FOREIGN KEY ("group_id", "stage_id", "season_id") REFERENCES "competition_groups"("id", "stage_id", "season_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_statistics" ADD CONSTRAINT "team_statistics_context_id_season_id_fkey" FOREIGN KEY ("context_id", "season_id") REFERENCES "statistic_contexts"("id", "season_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_statistics" ADD CONSTRAINT "team_statistics_season_id_team_id_fkey" FOREIGN KEY ("season_id", "team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_statistics" ADD CONSTRAINT "team_statistics_definition_id_value_type_fkey" FOREIGN KEY ("definition_id", "value_type") REFERENCES "statistic_definitions"("id", "value_type") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_context_id_season_id_fkey" FOREIGN KEY ("context_id", "season_id") REFERENCES "statistic_contexts"("id", "season_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_season_id_team_id_fkey" FOREIGN KEY ("season_id", "team_id") REFERENCES "season_teams"("season_id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_definition_id_value_type_fkey" FOREIGN KEY ("definition_id", "value_type") REFERENCES "statistic_definitions"("id", "value_type") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_country_fk" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_player_fk" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_manager_fk" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_venue_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_match_event_fk" FOREIGN KEY ("match_event_id") REFERENCES "match_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_lineup_fk" FOREIGN KEY ("lineup_id") REFERENCES "lineups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_lineup_player_fk" FOREIGN KEY ("lineup_player_id") REFERENCES "lineup_players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_standing_fk" FOREIGN KEY ("standing_id") REFERENCES "standings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_team_statistic_fk" FOREIGN KEY ("team_statistic_id") REFERENCES "team_statistics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_player_statistic_fk" FOREIGN KEY ("player_statistic_id") REFERENCES "player_statistics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_stage_fk" FOREIGN KEY ("stage_id") REFERENCES "competition_stages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_group_fk" FOREIGN KEY ("group_id") REFERENCES "competition_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_tie_fk" FOREIGN KEY ("tie_id") REFERENCES "knockout_ties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_registration_fk" FOREIGN KEY ("registration_id") REFERENCES "team_player_registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_assignment_fk" FOREIGN KEY ("assignment_id") REFERENCES "team_manager_assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "reference_score_period_fk" FOREIGN KEY ("score_period_id") REFERENCES "match_score_periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Expand the exactly-one typed provider mapping without losing legacy mappings.
ALTER TABLE external_references DROP CONSTRAINT "reference_exactly_one_entity";
ALTER TABLE external_references ADD CONSTRAINT reference_exactly_one_target CHECK (num_nonnulls(country_id, competition_id, season_id, team_id, player_id, manager_id, venue_id, match_id, match_event_id, lineup_id, lineup_player_id, standing_id, team_statistic_id, player_statistic_id, stage_id, group_id, tie_id, registration_id, assignment_id, score_period_id) = 1);
CREATE UNIQUE INDEX reference_external_country ON external_references(provider_id, external_id) WHERE country_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_player ON external_references(provider_id, external_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_manager ON external_references(provider_id, external_id) WHERE manager_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_venue ON external_references(provider_id, external_id) WHERE venue_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_match_event ON external_references(provider_id, external_id) WHERE match_event_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_lineup ON external_references(provider_id, external_id) WHERE lineup_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_lineup_player ON external_references(provider_id, external_id) WHERE lineup_player_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_standing ON external_references(provider_id, external_id) WHERE standing_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_team_statistic ON external_references(provider_id, external_id) WHERE team_statistic_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_player_statistic ON external_references(provider_id, external_id) WHERE player_statistic_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_stage ON external_references(provider_id, external_id) WHERE stage_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_group ON external_references(provider_id, external_id) WHERE group_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_tie ON external_references(provider_id, external_id) WHERE tie_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_registration ON external_references(provider_id, external_id) WHERE registration_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_assignment ON external_references(provider_id, external_id) WHERE assignment_id IS NOT NULL;
CREATE UNIQUE INDEX reference_external_score_period ON external_references(provider_id, external_id) WHERE score_period_id IS NOT NULL;

-- SQL constraints supplement Prisma: nullable context identities, values and cross-row integrity.
ALTER TABLE venues ADD CONSTRAINT venue_values CHECK (
  (capacity IS NULL OR capacity >= 0) AND
  (latitude IS NULL OR latitude BETWEEN -90 AND 90) AND
  (longitude IS NULL OR longitude BETWEEN -180 AND 180));
ALTER TABLE teams ADD CONSTRAINT team_founded_year CHECK (founded_year IS NULL OR founded_year BETWEEN 1 AND 9999);
ALTER TABLE competition_stages ADD CONSTRAINT stage_order CHECK (sort_order >= 0);
ALTER TABLE competition_groups ADD CONSTRAINT group_order CHECK (sort_order >= 0);
ALTER TABLE team_player_registrations ADD CONSTRAINT registration_values CHECK (
  (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on) AND
  (shirt_number IS NULL OR shirt_number BETWEEN 0 AND 999));
ALTER TABLE team_manager_assignments ADD CONSTRAINT assignment_dates CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on);
ALTER TABLE matches ADD CONSTRAINT match_context CHECK (
  (group_id IS NULL OR stage_id IS NOT NULL) AND
  (tie_id IS NULL OR stage_id IS NOT NULL) AND
  (group_id IS NULL OR tie_id IS NULL) AND
  ((tie_id IS NULL AND leg_number IS NULL) OR (tie_id IS NOT NULL AND leg_number IS NOT NULL AND leg_number > 0)) AND
  (added_minute IS NULL OR (minute IS NOT NULL AND added_minute >= 0)));
ALTER TABLE match_score_periods ADD CONSTRAINT period_scores CHECK (home_score >= 0 AND away_score >= 0);
ALTER TABLE match_events ADD CONSTRAINT event_values CHECK (
  sequence >= 0 AND revision > 0 AND (minute IS NULL OR minute >= 0) AND
  (added_minute IS NULL OR (minute IS NOT NULL AND added_minute >= 0)) AND
  (related_event_id IS NULL OR related_event_id <> id) AND
  num_nonnulls(player_id, manager_id) <= 1 AND
  (assist_player_id IS NULL OR (kind IN ('GOAL', 'PENALTY_GOAL') AND manager_id IS NULL)) AND
  (assist_player_id IS NULL OR player_id IS NULL OR assist_player_id <> player_id) AND
  ((kind = 'SUBSTITUTION' AND num_nonnulls(player_id, manager_id, assist_player_id) = 0) OR
   (kind <> 'SUBSTITUTION' AND player_in_id IS NULL AND player_out_id IS NULL)) AND
  (player_in_id IS NULL OR player_out_id IS NULL OR player_in_id <> player_out_id));
ALTER TABLE lineup_players ADD CONSTRAINT lineup_player_values CHECK (
  (shirt_number IS NULL OR shirt_number BETWEEN 0 AND 999) AND
  ((position_x IS NULL AND position_y IS NULL) OR
   (position_x IS NOT NULL AND position_y IS NOT NULL AND position_x BETWEEN 0 AND 100 AND position_y BETWEEN 0 AND 100)));
ALTER TABLE standings ADD CONSTRAINT standing_values CHECK (
  (group_id IS NULL OR stage_id IS NOT NULL) AND
  (position IS NULL OR position > 0) AND
  (played IS NULL OR played >= 0) AND (won IS NULL OR won >= 0) AND
  (drawn IS NULL OR drawn >= 0) AND (lost IS NULL OR lost >= 0) AND
  (goals_for IS NULL OR goals_for >= 0) AND (goals_against IS NULL OR goals_against >= 0) AND
  (played IS NULL OR won IS NULL OR drawn IS NULL OR lost IS NULL OR played::bigint = won::bigint + drawn + lost) AND
  (goal_difference IS NULL OR goals_for IS NULL OR goals_against IS NULL OR goal_difference::bigint = goals_for::bigint - goals_against) AND
  cardinality(form) <= 10 AND array_position(form, NULL) IS NULL AND
  (form_coverage NOT IN ('UNKNOWN', 'NOT_AVAILABLE') OR cardinality(form) = 0));
ALTER TABLE standings ALTER COLUMN form SET NOT NULL;
ALTER TABLE standings ADD CONSTRAINT standing_finite_points CHECK (
  (points IS NULL OR points <> 'NaN'::numeric) AND (points_adjustment IS NULL OR points_adjustment <> 'NaN'::numeric));
ALTER TABLE statistic_contexts ADD CONSTRAINT statistic_context_shape CHECK (
  (group_id IS NULL OR stage_id IS NOT NULL) AND
  ((scope = 'MATCH' AND match_id IS NOT NULL AND stage_id IS NULL AND group_id IS NULL AND split = 'OVERALL') OR
   (scope = 'SEASON' AND match_id IS NULL)));
ALTER TABLE team_statistics ADD CONSTRAINT team_statistic_value CHECK (
  (value_type = 'COUNT' AND decimal_value IS NULL AND (integer_value IS NULL OR integer_value >= 0)) OR
  (value_type IN ('DECIMAL', 'PERCENTAGE') AND integer_value IS NULL AND (decimal_value IS NULL OR
    (decimal_value >= 0 AND (value_type <> 'PERCENTAGE' OR decimal_value <= 100)))));
ALTER TABLE player_statistics ADD CONSTRAINT player_statistic_value CHECK (
  (value_type = 'COUNT' AND decimal_value IS NULL AND (integer_value IS NULL OR integer_value >= 0)) OR
  (value_type IN ('DECIMAL', 'PERCENTAGE') AND integer_value IS NULL AND (decimal_value IS NULL OR
    (decimal_value >= 0 AND (value_type <> 'PERCENTAGE' OR decimal_value <= 100)))));
ALTER TABLE team_statistics ADD CONSTRAINT team_statistic_finite CHECK (decimal_value IS NULL OR decimal_value <> 'NaN'::numeric);
ALTER TABLE player_statistics ADD CONSTRAINT player_statistic_finite CHECK (decimal_value IS NULL OR decimal_value <> 'NaN'::numeric);
ALTER TABLE knockout_ties ADD CONSTRAINT tie_values CHECK (
  round_number > 0 AND slot > 0 AND
  (first_team_id IS NULL OR second_team_id IS NULL OR first_team_id <> second_team_id) AND
  (winner_team_id IS NULL OR winner_team_id IS NOT DISTINCT FROM first_team_id OR winner_team_id IS NOT DISTINCT FROM second_team_id) AND
  ((first_aggregate IS NULL AND second_aggregate IS NULL) OR
   (first_aggregate IS NOT NULL AND second_aggregate IS NOT NULL AND first_aggregate >= 0 AND second_aggregate >= 0)) AND
  ((next_tie_id IS NULL AND next_slot IS NULL) OR (next_tie_id IS NOT NULL AND next_slot IS NOT NULL AND next_tie_id <> id)));

-- Lock the parent row so concurrent participant changes cannot bypass validation.
CREATE FUNCTION assert_match_participant(target_match uuid, target_team uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE fixture matches%ROWTYPE;
BEGIN
  IF target_team IS NULL THEN RETURN; END IF;
  SELECT * INTO fixture FROM matches WHERE id = target_match FOR SHARE;
  IF NOT FOUND OR target_team NOT IN (fixture.home_team_id, fixture.away_team_id) THEN
    RAISE EXCEPTION 'Team must participate in the match' USING ERRCODE = '23514';
  END IF;
END $$;
CREATE FUNCTION validate_detail_participant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM assert_match_participant(NEW.match_id, NEW.team_id);
  RETURN NEW;
END $$;
CREATE TRIGGER event_participant BEFORE INSERT OR UPDATE ON match_events FOR EACH ROW EXECUTE FUNCTION validate_detail_participant();
CREATE TRIGGER lineup_participant BEFORE INSERT OR UPDATE ON lineups FOR EACH ROW EXECUTE FUNCTION validate_detail_participant();
CREATE FUNCTION validate_stat_participant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE fixture_id uuid;
BEGIN
  SELECT match_id INTO fixture_id FROM statistic_contexts WHERE id = NEW.context_id FOR SHARE;
  IF fixture_id IS NOT NULL THEN PERFORM assert_match_participant(fixture_id, NEW.team_id); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER team_stat_participant BEFORE INSERT OR UPDATE ON team_statistics FOR EACH ROW EXECUTE FUNCTION validate_stat_participant();
CREATE TRIGGER player_stat_participant BEFORE INSERT OR UPDATE ON player_statistics FOR EACH ROW EXECUTE FUNCTION validate_stat_participant();
CREATE FUNCTION preserve_stat_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW.scope, NEW.season_id, NEW.match_id, NEW.stage_id, NEW.group_id, NEW.period, NEW.split)
     IS DISTINCT FROM ROW(OLD.id, OLD.scope, OLD.season_id, OLD.match_id, OLD.stage_id, OLD.group_id, OLD.period, OLD.split) THEN
    RAISE EXCEPTION 'Statistic context identity is immutable; create another context' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stat_context_identity BEFORE UPDATE ON statistic_contexts FOR EACH ROW EXECUTE FUNCTION preserve_stat_context();
CREATE FUNCTION preserve_match_participants() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.home_team_id, NEW.away_team_id) IS DISTINCT FROM ROW(OLD.home_team_id, OLD.away_team_id) AND (
    EXISTS (SELECT 1 FROM lineups WHERE match_id = OLD.id AND team_id NOT IN (NEW.home_team_id, NEW.away_team_id)) OR
    EXISTS (SELECT 1 FROM match_events WHERE match_id = OLD.id AND team_id NOT IN (NEW.home_team_id, NEW.away_team_id)) OR
    EXISTS (SELECT 1 FROM team_statistics s JOIN statistic_contexts c ON c.id = s.context_id WHERE c.match_id = OLD.id AND s.team_id NOT IN (NEW.home_team_id, NEW.away_team_id)) OR
    EXISTS (SELECT 1 FROM player_statistics s JOIN statistic_contexts c ON c.id = s.context_id WHERE c.match_id = OLD.id AND s.team_id NOT IN (NEW.home_team_id, NEW.away_team_id))
  ) THEN RAISE EXCEPTION 'Match participants have dependent details' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER match_participants BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION preserve_match_participants();

CREATE FUNCTION validate_stage_kind() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual stage_kind;
BEGIN
  SELECT kind INTO actual FROM competition_stages WHERE id = NEW.stage_id FOR SHARE;
  IF actual::text IS DISTINCT FROM TG_ARGV[0] THEN
    RAISE EXCEPTION 'Competition stage has an incompatible kind' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER group_stage_kind BEFORE INSERT OR UPDATE ON competition_groups FOR EACH ROW EXECUTE FUNCTION validate_stage_kind('GROUP');
CREATE TRIGGER tie_stage_kind BEFORE INSERT OR UPDATE ON knockout_ties FOR EACH ROW EXECUTE FUNCTION validate_stage_kind('KNOCKOUT');
CREATE FUNCTION preserve_stage_kind() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind <> OLD.kind AND (
    EXISTS (SELECT 1 FROM competition_groups WHERE stage_id = OLD.id) OR
    EXISTS (SELECT 1 FROM knockout_ties WHERE stage_id = OLD.id)
  ) THEN RAISE EXCEPTION 'Stage kind has dependent groups or ties' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stage_kind BEFORE UPDATE ON competition_stages FOR EACH ROW EXECUTE FUNCTION preserve_stage_kind();
CREATE FUNCTION validate_tie() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE next_round integer;
BEGIN
  IF NEW.next_tie_id IS NOT NULL THEN
    SELECT round_number INTO next_round FROM knockout_ties WHERE id = NEW.next_tie_id FOR SHARE;
    IF next_round IS NULL OR next_round <= NEW.round_number THEN
      RAISE EXCEPTION 'Knockout progression must advance to a later round' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM knockout_ties WHERE next_tie_id = NEW.id AND round_number >= NEW.round_number) THEN
    RAISE EXCEPTION 'Knockout progression must preserve earlier rounds' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE tie_id = NEW.id AND
    (NEW.first_team_id IS NULL OR NEW.second_team_id IS NULL OR
     home_team_id NOT IN (NEW.first_team_id, NEW.second_team_id) OR away_team_id NOT IN (NEW.first_team_id, NEW.second_team_id))) THEN
    RAISE EXCEPTION 'Tie participants have dependent matches' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tie_integrity BEFORE INSERT OR UPDATE ON knockout_ties FOR EACH ROW EXECUTE FUNCTION validate_tie();
CREATE FUNCTION validate_match_tie() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tie knockout_ties%ROWTYPE;
BEGIN
  IF NEW.tie_id IS NOT NULL THEN
    SELECT * INTO tie FROM knockout_ties WHERE id = NEW.tie_id FOR SHARE;
    IF NOT FOUND OR tie.first_team_id IS NULL OR tie.second_team_id IS NULL OR
       NEW.home_team_id NOT IN (tie.first_team_id, tie.second_team_id) OR NEW.away_team_id NOT IN (tie.first_team_id, tie.second_team_id) THEN
      RAISE EXCEPTION 'Match participants must match its knockout tie' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER match_tie_integrity BEFORE INSERT OR UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION validate_match_tie();

COMMIT;
