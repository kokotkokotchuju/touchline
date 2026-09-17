# Self-hosted production deployment

The repository includes templates under `deploy/` for a Linux VPS with Nginx
and systemd. They are examples only: replace the domain, certificate paths and
application paths before installing them.

## Required production controls

1. Create `/etc/touchline/touchline.env` owned by `root:touchline` with mode
   `0640`. Never commit it.
2. Generate secrets outside the repository:

   ```sh
   openssl rand -hex 32
   openssl rand -base64 32
   ```

   Use separate values for `ADMIN_PASSWORD` and `CRON_SECRET`.

3. Set `SITE_URL` to the real `https://` origin, `TRUST_PROXY=true`, and use a
   server-only `API_FOOTBALL_KEY`.
4. Bind PostgreSQL and Redis to localhost or a private network. Do not expose
   their ports to the public internet.
5. Install a certificate with Certbot and install
   `deploy/nginx/touchline.conf.example`. Nginx redirects HTTP to HTTPS and
   forwards sanitized proxy headers.
6. Run `npm run production:check` before starting the service. Production
   configuration fails closed if HTTPS, database, Redis, admin credentials,
   cron secret, or trusted proxy settings are missing.
7. Install and enable the application, catalog sync, live sync, backup and
   health-monitor systemd units/timers from `deploy/systemd/`. Catalog and
   live triggers use bounded exponential retries; the live timer runs every
   15 seconds and updates only already-mapped provider fixtures.
8. Provision a separate empty restore-verification database and set
   `BACKUP_RESTORE_DATABASE_URL` to its private connection string. The backup
   timer runs archive validation and an isolated `pg_restore` verification after
   each dump. Never point this variable at the production database.

The health timer checks `/api/health/ready` every minute and can notify an
external webhook through `HEALTH_ALERT_WEBHOOK_URL`. Keep the webhook URL and
any authorization token in the protected environment file.
