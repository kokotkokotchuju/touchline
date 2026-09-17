import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  globalTimeout: 300000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    actionTimeout: 10000,
    navigationTimeout: 15000,
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --port 3100 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      // Isolated test values, never deployment credentials. Keep local .env untouched.
      ADMIN_USERNAME: "playwright",
      ADMIN_PASSWORD: "playwright-local-test-password-only",
      CRON_SECRET: "playwright-local-cron-secret-only",
      SITE_URL: "https://127.0.0.1:3100",
      TRUST_PROXY: "true",
      FOOTBALL_READ_MODE: "demo",
      ALLOW_DEVELOPMENT_SEED: "true",
    },
  },
});
