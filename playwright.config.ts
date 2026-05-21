import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
	testDir: './tests/integration',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: `E2E_MODE=true pnpm preview --port ${PORT}`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		env: { E2E_MODE: 'true' }
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
