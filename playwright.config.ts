import { defineConfig, devices } from "@playwright/test"
import { config } from "dotenv"
import { resolve } from "path"

// Load test-specific env vars before anything else runs.
config({ path: resolve(__dirname, ".env.test.local") })

/**
 * Playwright configuration for Neptino E2E tests.
 *
 * Required environment variables (add to .env.test.local, not committed):
 *   NEXT_PUBLIC_SUPABASE_URL          – Supabase REST URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY     – Anon/publishable key (used by the app)
 *   SUPABASE_SERVICE_ROLE_KEY         – Service-role key (used only by test helpers)
 *   E2E_TEST_EMAIL                    – Email of a pre-seeded teacher account
 *   E2E_TEST_PASSWORD                 – Password of that account
 *   E2E_BASE_URL                      – Base URL of the running app (default: http://localhost:3000)
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // serial – tests share a single user + DB state

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the Next.js dev server automatically when running locally.
  // Set CI=true in your pipeline to skip this if you pre-build and serve separately.
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 90_000,
      },
})
