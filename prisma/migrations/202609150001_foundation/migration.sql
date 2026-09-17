CREATE TYPE "public"."competition_kind" AS ENUM('league', 'cup', 'international');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."team_kind" AS ENUM('club', 'national');--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "competition_kind" NOT NULL,
	"country_id" uuid,
	"region" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "external_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"competition_id" uuid,
	"season_id" uuid,
	"team_id" uuid,
	"match_id" uuid,
	CONSTRAINT "reference_provider_competition" UNIQUE("provider_id","competition_id"),
	CONSTRAINT "reference_provider_season" UNIQUE("provider_id","season_id"),
	CONSTRAINT "reference_provider_team" UNIQUE("provider_id","team_id"),
	CONSTRAINT "reference_provider_match" UNIQUE("provider_id","match_id"),
	CONSTRAINT "reference_exactly_one_entity" CHECK (num_nonnulls("external_references"."competition_id", "external_references"."season_id", "external_references"."team_id", "external_references"."match_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"kickoff_at" timestamp with time zone,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"minute" integer,
	"round" text,
	"venue_name" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_different_teams" CHECK ("matches"."home_team_id" <> "matches"."away_team_id"),
	CONSTRAINT "match_scores_nonnegative" CHECK (("matches"."home_score" IS NULL OR "matches"."home_score" >= 0) AND ("matches"."away_score" IS NULL OR "matches"."away_score" >= 0)),
	CONSTRAINT "match_scores_paired" CHECK (("matches"."home_score" IS NULL) = ("matches"."away_score" IS NULL)),
	CONSTRAINT "match_minute_nonnegative" CHECK ("matches"."minute" IS NULL OR "matches"."minute" >= 0)
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "season_teams" (
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "season_teams_season_id_team_id_pk" PRIMARY KEY("season_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_competition_name" UNIQUE("competition_id","name"),
	CONSTRAINT "season_dates_valid" CHECK ("seasons"."ends_on" >= "seasons"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"kind" "team_kind" NOT NULL,
	"country_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_external_competition" ON "external_references" USING btree ("provider_id","external_id") WHERE "external_references"."competition_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_external_season" ON "external_references" USING btree ("provider_id","external_id") WHERE "external_references"."season_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_external_team" ON "external_references" USING btree ("provider_id","external_id") WHERE "external_references"."team_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_external_match" ON "external_references" USING btree ("provider_id","external_id") WHERE "external_references"."match_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "match_kickoff_status_idx" ON "matches" USING btree ("kickoff_at","status");--> statement-breakpoint
CREATE INDEX "match_season_kickoff_idx" ON "matches" USING btree ("season_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "match_home_kickoff_idx" ON "matches" USING btree ("home_team_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "match_away_kickoff_idx" ON "matches" USING btree ("away_team_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "season_teams_team_idx" ON "season_teams" USING btree ("team_id");