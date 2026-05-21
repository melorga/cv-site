import { test, expect } from '@playwright/test';

// The actual KV-backed lockout is unit-tested in src/lib/server/__tests__/rate-limit.test.ts.
// This spec covers the user-facing surface: the error stays GENERIC across repeated
// failures (no enumeration leak).

test('failed sign-in shows generic error, never leaks the cause', async ({ page, context }) => {
	await context.route('**/api/auth/session', async (route) => {
		await route.fulfill({ status: 401, body: '{"error":"invalid-id-token"}' });
	});

	await page.goto('/');
	// Three attempts is enough to confirm the message stays identical
	for (let i = 0; i < 3; i++) {
		await page.getByLabel(/email/i).fill(`a${i}@b.c`);
		await page.getByLabel(/password/i).fill('wrongpw' + i);
		await page.getByRole('button', { name: /^sign in →$/i }).click();
		await expect(page.getByText(/sign-in failed/i)).toBeVisible();
	}

	// Critical: the rendered error must never reveal the underlying reason
	const errorRegion = page.getByRole('alert');
	const text = (await errorRegion.textContent()) ?? '';
	expect(text).not.toMatch(/invalid-id-token|user-not-found|wrong-password|email/i);
});
