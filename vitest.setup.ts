import '@testing-library/jest-dom/vitest';

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
