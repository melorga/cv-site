import { test, expect } from '@playwright/test';

test('Calendly script blocked → widget is never initialised', async ({ page, context }) => {
	await context.route('https://assets.calendly.com/**', (route) => route.abort());

	await page.goto('/');

	// Verify the page loaded and the Book CTA is present
	await expect(page.getByRole('button', { name: /book 15 min/i }).first()).toBeVisible();

	// With Calendly blocked, window.Calendly never appears
	const calendlyLoaded = await page.evaluate(() =>
		Boolean((window as unknown as { Calendly?: unknown }).Calendly)
	);
	expect(calendlyLoaded).toBe(false);
});
