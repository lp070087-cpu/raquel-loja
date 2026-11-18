import { defineConfig } from './backend/node_modules/@playwright/test/index.mjs';

export default defineConfig({
  testDir: './tests',
  testMatch: 'frontend-*.spec.mjs',
  testIgnore: 'frontend-live.spec.mjs',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'test-results/browser-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8000', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  outputDir: 'test-results/browser-artifacts',
});
