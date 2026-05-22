import '@testing-library/jest-dom/vitest';

// Test fixtures for VITE_* personal-profile env vars. profile.ts reads these
// at module load — set them before any component is imported so unit tests
// see deterministic values regardless of the local .env.
import.meta.env.VITE_PROFILE_NAME ??= 'Test Owner';
import.meta.env.VITE_PROFILE_ROLE ??= 'Software Engineer';
import.meta.env.VITE_PROFILE_LOCATION ??= 'Testville · Open to anything';
import.meta.env.VITE_CALENDLY_URL ??= 'https://calendly.com/test-owner';
import.meta.env.VITE_LINKEDIN_URL ??= 'https://www.linkedin.com/in/test-owner';
import.meta.env.VITE_CONTACT_EMAIL ??= 'test@example.invalid';

// jsdom in this configuration doesn't always wire localStorage onto globalThis.
// Polyfill a minimal in-memory store so ThemeToggle (and similar) work in tests.
if (typeof globalThis.localStorage === 'undefined') {
	const store = new Map<string, string>();
	const ls = {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => {
			store.set(k, String(v));
		},
		removeItem: (k: string) => {
			store.delete(k);
		},
		clear: () => store.clear(),
		key: (i: number) => Array.from(store.keys())[i] ?? null,
		get length() {
			return store.size;
		}
	};
	Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true });
}

// jsdom doesn't implement scrollTo on elements.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
	Element.prototype.scrollTo = function () {};
}
