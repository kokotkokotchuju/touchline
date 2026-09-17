BEGIN;

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "user_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "match_starting" BOOLEAN NOT NULL DEFAULT true,
  "goal" BOOLEAN NOT NULL DEFAULT true,
  "halftime" BOOLEAN NOT NULL DEFAULT false,
  "full_time" BOOLEAN NOT NULL DEFAULT true,
  "lineups" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_notification_preferences_user_id_key" ON "user_notification_preferences"("user_id");
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_favorites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "competition_id" UUID,
  "team_id" UUID,
  "player_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_favorites_exactly_one_target" CHECK (
    (CASE WHEN "competition_id" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "team_id" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "player_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);
CREATE UNIQUE INDEX "user_favorites_user_id_competition_id_key" ON "user_favorites"("user_id", "competition_id");
CREATE UNIQUE INDEX "user_favorites_user_id_team_id_key" ON "user_favorites"("user_id", "team_id");
CREATE UNIQUE INDEX "user_favorites_user_id_player_id_key" ON "user_favorites"("user_id", "player_id");
CREATE INDEX "user_favorites_user_id_created_at_idx" ON "user_favorites"("user_id", "created_at");
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_competition_id_fkey"
  FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;