import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run build && node scripts/serve-build.js --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 2 * 60_000,
  },
});
