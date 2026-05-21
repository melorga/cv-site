import { test, expect } from '@playwright/test';

test('anonymous visitor sees AuthGate', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText(/let's talk about/i)).toBeVisible();
	await expect(page.getByLabel(/email/i)).toBeVisible();
});

test('e2e_auth=1 cookie unlocks the chat view', async ({ page, context }) => {
	await context.addCookies([{ name: 'e2e_auth', value: '1', url: 'http://localhost:4173' }]);
	await page.goto('/');
	await expect(page.getByText('Mariano Elorga')).toBeVisible();
	await expect(page.getByText(/ask me/i)).toBeVisible();
});

test('sign out from chat returns to AuthGate', async ({ page, context }) => {
	await context.addCookies([{ name: 'e2e_auth', value: '1', url: 'http://localhost:4173' }]);
	await page.goto('/');
	await expect(page.getByText('Mariano Elorga')).toBeVisible();

	// Sign out doesn't clear the e2e_auth cookie (only firebase_session) — so we
	// remove the cookie manually after click to simulate a real logout flow.
	await page.getByRole('button', { name: /sign out/i }).click();
	await context.clearCookies();
	await page.goto('/');
	await expect(page.getByText(/let's talk about/i)).toBeVisible();
});
