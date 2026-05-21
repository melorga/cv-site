import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
	await context.addCookies([{ name: 'e2e_auth', value: '1', url: 'http://localhost:4173' }]);
	await context.route('**/api/chat', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				response: 'Mariano specializes in serverless architectures on AWS.',
				contextUsed: true
			})
		});
	});
});

test('clicking a suggestion chip sends a message and renders the response', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /What is your AWS specialty\?/i }).click();
	await expect(
		page.locator('[data-role="user"]').filter({ hasText: 'What is your AWS specialty?' })
	).toBeVisible();
	await expect(
		page.locator('[data-role="assistant"]').filter({ hasText: /serverless architectures/i })
	).toBeVisible();
});

test('typing a custom message works', async ({ page }) => {
	await page.goto('/');
	const input = page.getByPlaceholder(/ask anything/i);
	await input.fill('Tell me about your last role');
	await page.getByRole('button', { name: /send/i }).click();
	await expect(
		page.locator('[data-role="user"]').filter({ hasText: 'Tell me about your last role' })
	).toBeVisible();
	await expect(
		page.locator('[data-role="assistant"]').filter({ hasText: /serverless architectures/i })
	).toBeVisible();
});
