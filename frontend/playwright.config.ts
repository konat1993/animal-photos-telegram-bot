import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against production server. Run `npm run build` first (with demo mode for stable data).
 * CI builds with NEXT_PUBLIC_DEMO_MODE=true, then starts `next start` via webServer.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // `next start` does not work with output: "standalone" — use the Node server Next emits.
    command: "npm run start:standalone",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: "3001",
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
  },
});
