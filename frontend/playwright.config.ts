import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "8765";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `PORT=${port} bash ../scripts/e2e-server.sh`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
