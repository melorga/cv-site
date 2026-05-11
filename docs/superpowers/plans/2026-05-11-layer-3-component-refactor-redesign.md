# Layer 3 — Component Refactor + Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 1088-line `src/routes/+page.svelte` into focused components. Implement the **Sidebar Bio + Chat** layout in **Confident Modern / Warm Orange**. Add Calendly booking on both screens. Apply restrained-elegant motion (option C). The site emerges visually redesigned and structurally clean.

**Architecture:** TDD-driven. Each new component starts with a Vitest test that asserts its rendering and key behavior, then the component is built to pass the test. Components live in `src/lib/components/`. The `+page.svelte` becomes a thin shell branching on `data.user`. Server-side session detection is added via a new `+layout.server.ts`. Calendly is loaded lazily and falls back to a `mailto:` link if blocked.

**Tech Stack:** Svelte 5 (with `$state`/`$props` runes), SvelteKit 2, Tailwind 4 tokens (set in Layer 2), Vitest + `@testing-library/svelte` (added in Task 2), Calendly widget script.

---

## File Structure

**Created:**

- `src/lib/components/AuthGate.svelte` — public landing + sign-in.
- `src/lib/components/Sidebar.svelte` — authenticated left column.
- `src/lib/components/ChatPanel.svelte` — authenticated chat area.
- `src/lib/components/MessageBubble.svelte` — single message render.
- `src/lib/components/SuggestionChips.svelte` — chip row above input.
- `src/lib/components/BookingCta.svelte` — Calendly trigger with mailto fallback.
- `src/lib/components/ThemeToggle.svelte` — dark/light toggle (stripped of high-contrast).
- `src/lib/types.ts` — shared TS types (`User`, `ChatMessage`).
- `src/routes/+layout.server.ts` — loads session into `locals.user`.
- `src/lib/components/__tests__/AuthGate.test.ts`
- `src/lib/components/__tests__/Sidebar.test.ts`
- `src/lib/components/__tests__/ChatPanel.test.ts`
- `src/lib/components/__tests__/MessageBubble.test.ts`
- `src/lib/components/__tests__/SuggestionChips.test.ts`
- `src/lib/components/__tests__/BookingCta.test.ts`
- `src/lib/components/__tests__/ThemeToggle.test.ts`
- `vitest.config.ts`

**Modified:**

- `src/routes/+page.svelte` — collapsed to a thin shell (~30 lines).
- `src/routes/+layout.svelte` — preconnect for Calendly added; OG metadata kept; cyberpunk-specific meta tags pruned.
- `src/lib/firebase.ts` — adds the helper that exchanges a Firebase ID token for a session cookie.
- `src/app.css` — removes the temporary legacy-class shims added in Layer 2 Task 7.
- `package.json` — adds `vitest`, `@testing-library/svelte`, `@testing-library/jest-dom`, `jsdom` as dev deps; adds `test` and `test:watch` scripts.

**Untouched in this layer (Layer 4 hardens these):**

- `src/hooks.server.ts` — CSP entries for Calendly are added in Layer 4.
- `src/routes/api/*` — API routes get prompt-injection guard in Layer 4.

---

## Task 1: Baseline check

**Files:**

- None modified.

- [ ] **Step 1: Confirm Layers 1 and 2 are complete**

```bash
git log --oneline | head -20
```

Expected: top commits include Layer 2's Tailwind migration (`feat(tailwind): migrate to v4 ...`).

- [ ] **Step 2: Confirm pipeline is green**

```bash
pnpm validate && pnpm build
```

Expected: green. The site renders (intentionally with reduced styling from Layer 2).

---

## Task 2: Install testing framework

**Files:**

- Modify: `package.json` (devDependencies + scripts)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest + Svelte testing utilities**

```bash
pnpm add -D vitest@^2 @testing-library/svelte@^5 @testing-library/jest-dom@^6 @vitest/ui@^2 jsdom@^25
```

- [ ] **Step 2: Create `vitest.config.ts`**

Write `/Users/tuki/projects/cv-site/vitest.config.ts` with this content:

```ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	resolve: {
		conditions: process.env.VITEST ? ['browser'] : undefined
	}
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

Write `/Users/tuki/projects/cv-site/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add `test` scripts to package.json**

In `package.json`, inside the `"scripts"` block, add these two lines (preserve all existing scripts):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Sanity-check Vitest boots**

```bash
pnpm test
```

Expected: `No test files found` (we haven't written tests yet). Exit code 0 is fine. If it errors, the config is wrong — re-check Step 2.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json pnpm-lock.yaml
git commit -m "test(setup): add vitest + testing-library for component tests"
```

---

## Task 3: Shared types

**Files:**

- Create: `src/lib/types.ts`

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
export interface User {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	text: string;
	timestamp: Date;
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm check
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add shared User and ChatMessage types"
```

---

## Task 4: ThemeToggle component (TDD)

**Files:**

- Create: `src/lib/components/ThemeToggle.svelte`
- Create: `src/lib/components/__tests__/ThemeToggle.test.ts`

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/ThemeToggle.test.ts`:

```ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from '../ThemeToggle.svelte';

describe('ThemeToggle', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove('dark', 'light');
	});

	it('renders a button with an accessible label', () => {
		const { getByRole } = render(ThemeToggle);
		const btn = getByRole('button', { name: /toggle theme/i });
		expect(btn).toBeInTheDocument();
	});

	it('starts in dark mode by default', () => {
		render(ThemeToggle);
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('toggles to light mode on click and persists', async () => {
		const { getByRole } = render(ThemeToggle);
		await fireEvent.click(getByRole('button'));
		expect(document.documentElement.classList.contains('dark')).toBe(false);
		expect(localStorage.getItem('theme')).toBe('light');
	});

	it('reads stored preference on mount', () => {
		localStorage.setItem('theme', 'light');
		render(ThemeToggle);
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pnpm test src/lib/components/__tests__/ThemeToggle.test.ts
```

Expected: FAIL with "Failed to resolve import '../ThemeToggle.svelte'".

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/ThemeToggle.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	let isDark = $state(true);

	function applyTheme(dark: boolean) {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	function toggle() {
		isDark = !isDark;
		applyTheme(isDark);
	}

	onMount(() => {
		const stored = localStorage.getItem('theme');
		if (stored === 'light') {
			isDark = false;
		} else {
			isDark = true;
		}
		applyTheme(isDark);
	});
</script>

<button
	type="button"
	onclick={toggle}
	aria-label="Toggle theme"
	class="inline-flex h-8 w-8 items-center justify-center rounded-full
         text-fg-muted hover:text-fg hover:bg-canvas-elevated
         transition-colors duration-fast"
>
	{#if isDark}
		<!-- sun icon (svg inline, no external deps) -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4"></circle>
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			></path>
		</svg>
	{:else}
		<!-- moon icon -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
		</svg>
	{/if}
</button>
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
pnpm test src/lib/components/__tests__/ThemeToggle.test.ts
```

Expected: all four tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ThemeToggle.svelte src/lib/components/__tests__/ThemeToggle.test.ts
git commit -m "feat(components): add ThemeToggle with dark default"
```

---

## Task 5: MessageBubble component (TDD)

**Files:**

- Create: `src/lib/components/MessageBubble.svelte`
- Create: `src/lib/components/__tests__/MessageBubble.test.ts`

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/MessageBubble.test.ts`:

```ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import MessageBubble from '../MessageBubble.svelte';

describe('MessageBubble', () => {
	it('renders user text aligned right with accent background', () => {
		const { container, getByText } = render(MessageBubble, {
			role: 'user',
			text: 'Hello',
			timestamp: new Date('2026-05-11T10:00:00Z')
		});
		expect(getByText('Hello')).toBeInTheDocument();
		const wrapper = container.querySelector('[data-role="user"]');
		expect(wrapper).not.toBeNull();
	});

	it('renders assistant text aligned left with elevated background', () => {
		const { container } = render(MessageBubble, {
			role: 'assistant',
			text: 'Hi there',
			timestamp: new Date()
		});
		const wrapper = container.querySelector('[data-role="assistant"]');
		expect(wrapper).not.toBeNull();
	});

	it('includes the fade-in animation class', () => {
		const { container } = render(MessageBubble, {
			role: 'user',
			text: 'x',
			timestamp: new Date()
		});
		expect(container.firstChild).toHaveClass('animate-fade-in');
	});
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pnpm test src/lib/components/__tests__/MessageBubble.test.ts
```

Expected: FAIL ("Failed to resolve import").

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/MessageBubble.svelte`:

```svelte
<script lang="ts">
	import type { ChatMessage } from '$lib/types';

	let { role, text }: { role: ChatMessage['role']; text: string; timestamp: Date } = $props();
</script>

<div
	data-role={role}
	class="animate-fade-in flex w-full"
	class:justify-end={role === 'user'}
	class:justify-start={role === 'assistant'}
>
	<div
		class="max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
		class:bg-accent={role === 'user'}
		class:text-on-accent={role === 'user'}
		class:font-medium={role === 'user'}
		class:bg-canvas-elevated={role === 'assistant'}
		class:text-fg={role === 'assistant'}
		class:border={role === 'assistant'}
		class:border-line={role === 'assistant'}
		class:rounded-br-sm={role === 'user'}
		class:rounded-bl-sm={role === 'assistant'}
	>
		{text}
	</div>
</div>
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/components/__tests__/MessageBubble.test.ts
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/MessageBubble.svelte src/lib/components/__tests__/MessageBubble.test.ts
git commit -m "feat(components): add MessageBubble with role-based styling"
```

---

## Task 6: SuggestionChips component (TDD)

**Files:**

- Create: `src/lib/components/SuggestionChips.svelte`
- Create: `src/lib/components/__tests__/SuggestionChips.test.ts`

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/SuggestionChips.test.ts`:

```ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SuggestionChips from '../SuggestionChips.svelte';

describe('SuggestionChips', () => {
	it('renders each prompt as a chip', () => {
		const prompts = ['What is your AWS specialty?', 'Show me a project'];
		const { getByText } = render(SuggestionChips, { prompts, onSelect: () => {} });
		expect(getByText(prompts[0])).toBeInTheDocument();
		expect(getByText(prompts[1])).toBeInTheDocument();
	});

	it('calls onSelect with the prompt text when a chip is clicked', async () => {
		const onSelect = vi.fn();
		const prompts = ['Pick me'];
		const { getByText } = render(SuggestionChips, { prompts, onSelect });
		await fireEvent.click(getByText('Pick me'));
		expect(onSelect).toHaveBeenCalledWith('Pick me');
	});

	it('renders nothing when prompts is empty', () => {
		const { container } = render(SuggestionChips, { prompts: [], onSelect: () => {} });
		expect(container.querySelectorAll('button')).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/components/__tests__/SuggestionChips.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/SuggestionChips.svelte`:

```svelte
<script lang="ts">
	let { prompts, onSelect }: { prompts: string[]; onSelect: (text: string) => void } = $props();
</script>

{#if prompts.length > 0}
	<div class="flex flex-wrap gap-2">
		{#each prompts as prompt (prompt)}
			<button
				type="button"
				onclick={() => onSelect(prompt)}
				class="rounded-full border border-line bg-canvas-elevated px-3 py-1.5
               text-xs text-fg-muted
               hover:border-accent hover:text-fg
               transition-colors duration-fast"
			>
				{prompt}
			</button>
		{/each}
	</div>
{/if}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/components/__tests__/SuggestionChips.test.ts
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SuggestionChips.svelte src/lib/components/__tests__/SuggestionChips.test.ts
git commit -m "feat(components): add SuggestionChips with hover-orange affordance"
```

---

## Task 7: BookingCta component (TDD)

**Files:**

- Create: `src/lib/components/BookingCta.svelte`
- Create: `src/lib/components/__tests__/BookingCta.test.ts`

The Calendly link will be configurable via prop. If the Calendly widget script is not present (CSP-blocked or fetch fails), the button falls back to a `mailto:` link.

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/BookingCta.test.ts`:

```ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookingCta from '../BookingCta.svelte';

describe('BookingCta', () => {
	beforeEach(() => {
		// Reset window.Calendly state between tests
		delete (window as any).Calendly;
	});

	it('renders an orange pill with "Book 15 min" label', () => {
		const { getByRole } = render(BookingCta, {
			calendlyUrl: 'https://calendly.com/me/15min',
			mailtoFallback: 'mailto:me@example.com?subject=15min'
		});
		expect(getByRole('button', { name: /book 15 min/i })).toBeInTheDocument();
	});

	it('calls Calendly.initPopupWidget when widget is loaded', async () => {
		const initPopup = vi.fn();
		(window as any).Calendly = { initPopupWidget: initPopup };
		const { getByRole } = render(BookingCta, {
			calendlyUrl: 'https://calendly.com/me/15min',
			mailtoFallback: 'mailto:me@example.com'
		});
		await fireEvent.click(getByRole('button'));
		expect(initPopup).toHaveBeenCalledWith({ url: 'https://calendly.com/me/15min' });
	});

	it('falls back to mailto when Calendly is not available', async () => {
		const original = window.location.href;
		const setHrefSpy = vi.fn();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: {
				...window.location,
				set href(v: string) {
					setHrefSpy(v);
				},
				get href() {
					return original;
				}
			}
		});
		const { getByRole } = render(BookingCta, {
			calendlyUrl: 'https://calendly.com/me/15min',
			mailtoFallback: 'mailto:me@example.com?subject=15min'
		});
		await fireEvent.click(getByRole('button'));
		expect(setHrefSpy).toHaveBeenCalledWith('mailto:me@example.com?subject=15min');
	});
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/components/__tests__/BookingCta.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/BookingCta.svelte`:

```svelte
<script lang="ts">
	let {
		calendlyUrl,
		mailtoFallback,
		variant = 'solid'
	}: { calendlyUrl: string; mailtoFallback: string; variant?: 'solid' | 'ghost' } = $props();

	function openBooking() {
		const Calendly = (
			window as unknown as { Calendly?: { initPopupWidget: (opts: { url: string }) => void } }
		).Calendly;
		if (Calendly && typeof Calendly.initPopupWidget === 'function') {
			Calendly.initPopupWidget({ url: calendlyUrl });
		} else {
			window.location.href = mailtoFallback;
		}
	}
</script>

<button
	type="button"
	onclick={openBooking}
	class="inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors duration-fast"
	class:bg-accent={variant === 'solid'}
	class:text-on-accent={variant === 'solid'}
	class:hover:bg-accent-hover={variant === 'solid'}
	class:bg-transparent={variant === 'ghost'}
	class:text-fg={variant === 'ghost'}
	class:border={variant === 'ghost'}
	class:border-line-strong={variant === 'ghost'}
	class:hover:border-accent={variant === 'ghost'}
>
	<span aria-hidden="true">📅</span>
	Book 15 min
</button>
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/components/__tests__/BookingCta.test.ts
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/BookingCta.svelte src/lib/components/__tests__/BookingCta.test.ts
git commit -m "feat(components): add BookingCta with Calendly + mailto fallback"
```

---

## Task 8: Sidebar component (TDD)

**Files:**

- Create: `src/lib/components/Sidebar.svelte`
- Create: `src/lib/components/__tests__/Sidebar.test.ts`

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/Sidebar.test.ts`:

```ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../Sidebar.svelte';
import type { User } from '$lib/types';

const user: User = {
	uid: 'u1',
	email: 'visitor@example.com',
	displayName: 'Visitor',
	photoURL: null
};

describe('Sidebar', () => {
	it('renders the owner name (Mariano), not the visitor name', () => {
		const { getByText } = render(Sidebar, { user, onSignOut: () => {} });
		expect(getByText('Mariano Elorga')).toBeInTheDocument();
	});

	it('renders LinkedIn and Calendar links', () => {
		const { getByRole } = render(Sidebar, { user, onSignOut: () => {} });
		expect(getByRole('link', { name: /linkedin/i })).toBeInTheDocument();
		expect(getByRole('link', { name: /calendar/i })).toBeInTheDocument();
	});

	it('calls onSignOut when sign-out is clicked', async () => {
		const onSignOut = vi.fn();
		const { getByRole } = render(Sidebar, { user, onSignOut });
		await fireEvent.click(getByRole('button', { name: /sign out/i }));
		expect(onSignOut).toHaveBeenCalled();
	});

	it('shows visitor email in a discreet "signed in as" line', () => {
		const { getByText } = render(Sidebar, { user, onSignOut: () => {} });
		expect(getByText(/visitor@example\.com/)).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/components/__tests__/Sidebar.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/Sidebar.svelte`:

```svelte
<script lang="ts">
	import type { User } from '$lib/types';
	import ThemeToggle from './ThemeToggle.svelte';

	let { user, onSignOut }: { user: User; onSignOut: () => void } = $props();
</script>

<aside
	class="flex h-full w-full flex-col gap-6 bg-canvas-deep border-r border-line p-6
         md:w-72 md:min-w-72"
>
	<!-- Identity block -->
	<div class="flex flex-col gap-3">
		<div
			class="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-orange-700"
			aria-hidden="true"
		></div>
		<div>
			<div class="text-sm font-semibold text-fg leading-tight">Mariano Elorga</div>
			<div class="text-xs text-fg-muted mt-0.5">AWS Solutions Architect</div>
		</div>
		<div class="text-[11px] text-fg-subtle">Madrid · Open to roles</div>
	</div>

	<!-- Links -->
	<nav class="flex flex-col gap-1.5">
		<a
			href="https://www.linkedin.com/in/mariano-elorga"
			rel="noopener noreferrer"
			target="_blank"
			class="text-xs text-fg-muted hover:text-accent transition-colors duration-fast">LinkedIn ↗</a
		>
		<a
			href="https://calendly.com/mariano-elorga/15min"
			rel="noopener noreferrer"
			target="_blank"
			class="text-xs text-fg-muted hover:text-accent transition-colors duration-fast">Calendar ↗</a
		>
	</nav>

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Footer -->
	<div class="flex flex-col gap-3 text-[11px] text-fg-subtle">
		<div>Signed in as {user.email ?? 'anonymous'}</div>
		<div class="flex items-center justify-between">
			<button
				type="button"
				onclick={onSignOut}
				class="text-xs text-fg-muted hover:text-fg underline-offset-2 hover:underline transition-colors duration-fast"
				>Sign out</button
			>
			<ThemeToggle />
		</div>
	</div>
</aside>
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/components/__tests__/Sidebar.test.ts
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Sidebar.svelte src/lib/components/__tests__/Sidebar.test.ts
git commit -m "feat(components): add Sidebar with bio, links, sign-out and theme toggle"
```

---

## Task 9: ChatPanel component (TDD)

**Files:**

- Create: `src/lib/components/ChatPanel.svelte`
- Create: `src/lib/components/__tests__/ChatPanel.test.ts`

The ChatPanel owns the conversation `$state`, makes POST requests to `/api/chat`, streams responses (the existing endpoint returns JSON, not SSE — we'll consume JSON for now; SSE streaming is deferred to Layer 4's hardening pass), and renders message bubbles.

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/ChatPanel.test.ts`:

```ts
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatPanel from '../ChatPanel.svelte';
import type { User } from '$lib/types';

const user: User = { uid: 'u1', email: 'v@example.com', displayName: null, photoURL: null };

describe('ChatPanel', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the greeting and input', () => {
		const { getByText, getByPlaceholderText } = render(ChatPanel, {
			user,
			initialPrompts: ['Q1']
		});
		expect(getByText(/ask me anything/i)).toBeInTheDocument();
		expect(getByPlaceholderText(/ask anything/i)).toBeInTheDocument();
	});

	it('renders the initial suggestion chips', () => {
		const { getByText } = render(ChatPanel, {
			user,
			initialPrompts: ['What is your AWS specialty?']
		});
		expect(getByText('What is your AWS specialty?')).toBeInTheDocument();
	});

	it('sends a message and appends both user and assistant bubbles', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ response: 'I specialize in X', contextUsed: true })
		});
		const { getByPlaceholderText, getByRole, getByText } = render(ChatPanel, {
			user,
			initialPrompts: []
		});
		const input = getByPlaceholderText(/ask anything/i) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'Tell me about you' } });
		await fireEvent.click(getByRole('button', { name: /send/i }));
		await waitFor(() => expect(getByText('Tell me about you')).toBeInTheDocument());
		await waitFor(() => expect(getByText('I specialize in X')).toBeInTheDocument());
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/chat',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('shows a friendly error on fetch failure', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
		const { getByPlaceholderText, getByRole, findByText } = render(ChatPanel, {
			user,
			initialPrompts: []
		});
		const input = getByPlaceholderText(/ask anything/i) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'hi' } });
		await fireEvent.click(getByRole('button', { name: /send/i }));
		expect(await findByText(/slow down/i)).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/components/__tests__/ChatPanel.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/ChatPanel.svelte`:

```svelte
<script lang="ts">
	import type { ChatMessage, User } from '$lib/types';
	import MessageBubble from './MessageBubble.svelte';
	import SuggestionChips from './SuggestionChips.svelte';
	import BookingCta from './BookingCta.svelte';

	let { user, initialPrompts }: { user: User; initialPrompts: string[] } = $props();

	let messages: ChatMessage[] = $state([]);
	let draft = $state('');
	let inflight = $state(false);
	let error: string | null = $state(null);
	let listEl: HTMLDivElement | undefined = $state();

	const CALENDLY_URL = 'https://calendly.com/mariano-elorga/15min';
	const MAILTO_FALLBACK = 'mailto:hello@melorga.dev?subject=Quick%20chat%20%E2%80%94%2015%20min';

	async function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || inflight) return;

		messages = [...messages, { role: 'user', text: trimmed, timestamp: new Date() }];
		draft = '';
		inflight = true;
		error = null;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: trimmed })
			});
			if (!res.ok) {
				if (res.status === 429) {
					error = "Slow down — you've sent a lot recently. Try again in a moment.";
				} else if (res.status === 403) {
					error = 'Your session needs to refresh. Please sign in again.';
				} else {
					error = 'The assistant is taking a moment. Try again?';
				}
				return;
			}
			const data = (await res.json()) as { response: string };
			messages = [...messages, { role: 'assistant', text: data.response, timestamp: new Date() }];
		} catch {
			error = 'Network error — check your connection.';
		} finally {
			inflight = false;
			// scroll to bottom on next tick
			queueMicrotask(() => {
				listEl?.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
			});
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		send(draft);
	}
</script>

<section class="flex h-full w-full flex-col">
	<!-- Top bar -->
	<header class="flex items-center justify-between border-b border-line px-6 py-3">
		<div class="text-xs font-bold tracking-widest text-accent">M · E</div>
		<BookingCta calendlyUrl={CALENDLY_URL} mailtoFallback={MAILTO_FALLBACK} />
	</header>

	<!-- Message list (or greeting) -->
	<div bind:this={listEl} class="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
		{#if messages.length === 0}
			<div class="mx-auto max-w-prose pt-6 hero-glow">
				<div class="text-3xl font-bold tracking-tight text-fg leading-tight md:text-4xl">
					Ask me <span class="text-accent">anything</span>.
				</div>
				<p class="mt-3 text-sm text-fg-muted">
					I'm Mariano — AWS Solutions Architect. The AI knows my work, projects, and how I think. Or
					grab a quick call on the calendar.
				</p>
			</div>
		{:else}
			<div class="mx-auto flex max-w-prose flex-col gap-3">
				{#each messages as msg, i (i + msg.timestamp.toISOString())}
					<MessageBubble role={msg.role} text={msg.text} timestamp={msg.timestamp} />
				{/each}
				{#if inflight}
					<div class="text-xs text-fg-subtle italic px-1">thinking…</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Composer -->
	<footer class="border-t border-line px-6 py-4">
		<div class="mx-auto max-w-prose flex flex-col gap-3">
			<SuggestionChips prompts={initialPrompts} onSelect={(p) => send(p)} />

			{#if error}
				<div role="alert" class="text-xs text-accent">{error}</div>
			{/if}

			<form
				onsubmit={handleSubmit}
				class="flex items-center gap-2 rounded-pill border border-line bg-canvas-elevated pl-4 pr-1.5 py-1.5 focus-within:border-accent transition-colors duration-fast"
			>
				<input
					type="text"
					bind:value={draft}
					placeholder="Ask anything about Mariano…"
					autocomplete="off"
					maxlength="1000"
					disabled={inflight}
					class="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={inflight || !draft.trim()}
					aria-label="Send"
					class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent font-bold disabled:opacity-40 transition-opacity duration-fast"
					>↑</button
				>
			</form>
		</div>
	</footer>
</section>
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/components/__tests__/ChatPanel.test.ts
```

Expected: all four PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ChatPanel.svelte src/lib/components/__tests__/ChatPanel.test.ts
git commit -m "feat(components): add ChatPanel with greeting, chips, error handling"
```

---

## Task 10: AuthGate component (TDD)

**Files:**

- Create: `src/lib/components/AuthGate.svelte`
- Create: `src/lib/components/__tests__/AuthGate.test.ts`

AuthGate handles the unauthenticated landing. It wraps the existing Turnstile widget and Firebase email/password sign-in. It also offers register and includes a BookingCta as a secondary affordance.

- [ ] **Step 1: Write failing test**

Create `/Users/tuki/projects/cv-site/src/lib/components/__tests__/AuthGate.test.ts`:

```ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import AuthGate from '../AuthGate.svelte';

describe('AuthGate', () => {
	it('renders the inviting headline', () => {
		const { getByText } = render(AuthGate, { onAuthenticated: () => {} });
		expect(getByText(/let's talk about/i)).toBeInTheDocument();
	});

	it('renders email and password inputs', () => {
		const { getByLabelText } = render(AuthGate, { onAuthenticated: () => {} });
		expect(getByLabelText(/email/i)).toBeInTheDocument();
		expect(getByLabelText(/password/i)).toBeInTheDocument();
	});

	it('renders the Book 15 min CTA', () => {
		const { getByRole } = render(AuthGate, { onAuthenticated: () => {} });
		expect(getByRole('button', { name: /book 15 min/i })).toBeInTheDocument();
	});

	it('shows a generic error on sign-in failure (no detail leak)', async () => {
		const { getByLabelText, getByRole, findByText } = render(AuthGate, {
			onAuthenticated: () => {},
			signInImpl: async () => {
				throw new Error('user-not-found');
			}
		});
		await fireEvent.input(getByLabelText(/email/i), { target: { value: 'a@b.c' } });
		await fireEvent.input(getByLabelText(/password/i), { target: { value: 'xxx' } });
		await fireEvent.click(getByRole('button', { name: /^sign in$/i }));
		const err = await findByText(/sign-in failed/i);
		expect(err).toBeInTheDocument();
		// Crucial: error must NOT reveal which input was wrong
		expect(err.textContent).not.toMatch(/user-not-found|invalid-email|wrong-password/i);
	});
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/components/__tests__/AuthGate.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create the component**

Write `/Users/tuki/projects/cv-site/src/lib/components/AuthGate.svelte`:

```svelte
<script lang="ts">
	import BookingCta from './BookingCta.svelte';
	import Turnstile from '$lib/Turnstile.svelte';

	let {
		onAuthenticated,
		signInImpl
	}: {
		onAuthenticated: () => void;
		/** Optional override for tests — defaults to Firebase implementation. */
		signInImpl?: (email: string, password: string, turnstileToken: string) => Promise<void>;
	} = $props();

	let email = $state('');
	let password = $state('');
	let mode: 'login' | 'register' = $state('login');
	let turnstileToken = $state('');
	let busy = $state(false);
	let error: string | null = $state(null);

	const CALENDLY_URL = 'https://calendly.com/mariano-elorga/15min';
	const MAILTO_FALLBACK = 'mailto:hello@melorga.dev?subject=Quick%20chat%20%E2%80%94%2015%20min';

	async function defaultSignIn(em: string, pw: string, token: string): Promise<void> {
		const { signIn } = await import('$lib/firebase');
		await signIn(em, pw, mode, token);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (busy) return;
		error = null;
		if (!email || !password) {
			error = 'Please enter your email and password.';
			return;
		}
		busy = true;
		try {
			await (signInImpl ?? defaultSignIn)(email, password, turnstileToken);
			onAuthenticated();
		} catch {
			// Generic error — never reveal which field was wrong
			error = 'Sign-in failed. Try again or reset your password.';
		} finally {
			busy = false;
		}
	}
</script>

<main class="relative flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
	<div class="absolute inset-0 hero-glow pointer-events-none animate-accent-drift"></div>
	<div class="relative w-full max-w-md flex flex-col gap-8 animate-fade-in">
		<div>
			<div class="text-xs font-bold tracking-widest text-accent">M · E</div>
			<h1 class="mt-3 text-4xl font-bold tracking-tight text-fg leading-[0.95] md:text-5xl">
				Let's talk about<br />your <span class="text-accent italic-noslant">next</span> build.
			</h1>
			<p class="mt-4 text-sm text-fg-muted">
				I architect cloud systems that actually ship. Step inside to chat with my AI assistant, or
				grab time on the calendar.
			</p>
		</div>

		<form onsubmit={submit} class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[11px] uppercase tracking-wider text-fg-subtle">Email</span>
				<input
					type="email"
					bind:value={email}
					autocomplete="email"
					required
					class="rounded-md border border-line bg-canvas-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent transition-colors"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[11px] uppercase tracking-wider text-fg-subtle">Password</span>
				<input
					type="password"
					bind:value={password}
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					required
					minlength="8"
					class="rounded-md border border-line bg-canvas-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent transition-colors"
				/>
			</label>

			<div class="my-1">
				<Turnstile onVerify={(t) => (turnstileToken = t)} />
			</div>

			{#if error}
				<div role="alert" class="text-xs text-accent">{error}</div>
			{/if}

			<div class="flex items-center gap-3 mt-1">
				<button
					type="submit"
					disabled={busy}
					class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50 transition-colors"
					>{mode === 'login' ? 'Sign in' : 'Create account'} →</button
				>
				<button
					type="button"
					onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
					class="text-xs text-fg-muted hover:text-fg underline-offset-2 hover:underline transition-colors"
					>{mode === 'login' ? 'Create account' : 'Already have one? Sign in'}</button
				>
			</div>
		</form>

		<div class="flex items-center gap-3 pt-2 border-t border-line">
			<span class="text-xs text-fg-subtle">Just want to chat?</span>
			<BookingCta calendlyUrl={CALENDLY_URL} mailtoFallback={MAILTO_FALLBACK} variant="ghost" />
		</div>
	</div>
</main>
```

- [ ] **Step 4: Add `signIn` helper to firebase.ts**

Open `src/lib/firebase.ts`. Add an export named `signIn` that wraps the existing Firebase auth flow. Read the current file:

```bash
cat src/lib/firebase.ts | head -60
```

The current file likely has `initFirebase` and `getFirebaseAuth`. Append a new export (preserving everything that exists):

```ts
/**
 * Sign in (or register) the user with email+password, then exchange the
 * Firebase ID token for an httpOnly session cookie via /api/auth/session.
 */
export async function signIn(
	email: string,
	password: string,
	mode: 'login' | 'register',
	turnstileToken: string
): Promise<void> {
	const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import(
		'firebase/auth'
	);
	initFirebase();
	const auth = getFirebaseAuth();
	if (!auth) throw new Error('auth-unavailable');

	const credential =
		mode === 'login'
			? await signInWithEmailAndPassword(auth, email, password)
			: await createUserWithEmailAndPassword(auth, email, password);

	const idToken = await credential.user.getIdToken();
	const res = await fetch('/api/auth/session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ idToken, turnstileToken })
	});
	if (!res.ok) throw new Error('session-exchange-failed');
}
```

The `/api/auth/session` endpoint is created in Layer 4 — this layer's test patches `signInImpl` so the missing endpoint doesn't fail tests. In manual smoke testing of Layer 3, you'll get a non-blocking warning toast that the session can't persist — this is OK and resolved by Layer 4.

- [ ] **Step 5: Run test, confirm pass**

```bash
pnpm test src/lib/components/__tests__/AuthGate.test.ts
```

Expected: all four PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/AuthGate.svelte src/lib/components/__tests__/AuthGate.test.ts src/lib/firebase.ts
git commit -m "feat(components): add AuthGate (sign-in + register + booking CTA)"
```

---

## Task 11: `+layout.server.ts` — server-side session detection

**Files:**

- Create: `src/routes/+layout.server.ts`
- Modify: `src/app.d.ts` — extend `App.Locals` and `App.PageData`.

The Firebase session cookie verification logic itself is built in Layer 4 (in `src/lib/server/session.ts`). For Layer 3, we stub it: if a cookie named `firebase_session` exists, we treat the user as authenticated with a placeholder user object. Layer 4 replaces this stub with real verification.

- [ ] **Step 1: Update `src/app.d.ts`**

Read the current file:

```bash
cat src/app.d.ts
```

Replace its contents with:

```ts
// See https://kit.svelte.dev/docs/types#app
import type { User } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			nonce: string;
			user: User | null;
		}
		interface PageData {
			user: User | null;
		}
		interface Platform {
			env?: {
				TURNSTILE_SECRET?: string;
				GROQ_API_KEY?: string;
				PROFILE_VECTORS?: KVNamespace;
				VISITOR_LOG?: KVNamespace;
				VISITOR_LOG_SALT?: string;
				SESSION_SECRET?: string;
				ALLOW_EVAL?: string;
			};
		}
	}
}

export {};
```

- [ ] **Step 2: Create `+layout.server.ts`**

Write `/Users/tuki/projects/cv-site/src/routes/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, locals }) => {
	// STUB FOR LAYER 3.
	// Real verification (HMAC signature, expiry, Firebase ID-token check)
	// lands in Layer 4 via src/lib/server/session.ts.
	// For now, the presence of a non-empty firebase_session cookie counts as authenticated.
	const sessionCookie = cookies.get('firebase_session');
	if (sessionCookie && sessionCookie.length > 0) {
		locals.user = {
			uid: 'pending-layer-4',
			email: 'pending@layer-4.local',
			displayName: null,
			photoURL: null
		};
	} else {
		locals.user = null;
	}
	return { user: locals.user };
};
```

- [ ] **Step 3: Type-check passes**

```bash
pnpm check
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.server.ts src/app.d.ts
git commit -m "feat(auth): add +layout.server.ts session stub (real verification in Layer 4)"
```

---

## Task 12: Rewrite `+page.svelte` as thin shell

**Files:**

- Modify: `src/routes/+page.svelte` — replace entire file.

- [ ] **Step 1: Capture the legacy file for reference**

```bash
cp src/routes/+page.svelte /tmp/old-page.svelte
wc -l src/routes/+page.svelte
```

Expected: ~1088 lines (the legacy giant).

- [ ] **Step 2: Replace the file**

Overwrite `/Users/tuki/projects/cv-site/src/routes/+page.svelte` with:

```svelte
<script lang="ts">
	import AuthGate from '$lib/components/AuthGate.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Suggested prompts displayed to the user
	const initialPrompts = [
		'What is your AWS specialty?',
		'Show me a recent project',
		'Why should we hire you?',
		'Are you open to remote roles?'
	];

	async function handleSignOut() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}

	function handleAuthenticated() {
		// Layer 4 sets the firebase_session cookie via /api/auth/session.
		// For Layer 3, simply reload so the layout load function picks up state.
		window.location.href = '/';
	}
</script>

<svelte:head>
	<title>Mariano Elorga — AWS Solutions Architect</title>
	<!-- Calendly widget script (CSP entry added in Layer 4) -->
	<link rel="preconnect" href="https://assets.calendly.com" />
	<link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css" />
	<script src="https://assets.calendly.com/assets/external/widget.js" async></script>
</svelte:head>

{#if data.user}
	<div class="flex min-h-screen w-full">
		<Sidebar user={data.user} onSignOut={handleSignOut} />
		<main class="flex-1">
			<ChatPanel user={data.user} {initialPrompts} />
		</main>
	</div>
{:else}
	<AuthGate onAuthenticated={handleAuthenticated} />
{/if}
```

- [ ] **Step 3: Confirm size dropped**

```bash
wc -l src/routes/+page.svelte
```

Expected: ~50 lines. Down from ~1088.

- [ ] **Step 4: Run unit tests**

```bash
pnpm test
```

Expected: all PASS.

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: builds successfully.

- [ ] **Step 6: Smoke-test dev**

```bash
pnpm dev
```

Open http://localhost:5173.

Expected:

- Unauthenticated landing: AuthGate renders with hero, form, and orange CTAs.
- Hover the "Book 15 min" pill: Calendly widget loads (or, if blocked, falls back to mailto).
- Form submission with empty fields: validates inline.
- (No Firebase config in dev? Then sign-in errors with the generic "Sign-in failed" message — that's expected.)

Set a temporary cookie to preview the authenticated state:

```js
// In DevTools console:
document.cookie = 'firebase_session=preview; path=/';
location.reload();
```

Expected: the Sidebar + ChatPanel renders. ChatPanel greeting shows; clicking a suggestion chip sends a fetch to `/api/chat` (will 403 without a valid `captcha_session` — that's expected in pure dev).

Clear the cookie:

```js
document.cookie = 'firebase_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
```

Cmd+C to stop.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "refactor: replace 1088-line +page.svelte with thin shell (AuthGate | Sidebar+ChatPanel)"
```

---

## Task 13: Clean up `+layout.svelte`

**Files:**

- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Read current file**

```bash
cat src/routes/+layout.svelte
```

- [ ] **Step 2: Trim cyberpunk-era meta tags and ensure preconnects for Calendly**

Overwrite `/Users/tuki/projects/cv-site/src/routes/+layout.svelte` with:

```svelte
<script>
	import '../app.css';
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>

	<meta name="theme-color" content="#111111" />
	<meta name="color-scheme" content="dark light" />

	<!-- Open Graph -->
	<meta property="og:title" content="Mariano Elorga — AWS Solutions Architect" />
	<meta
		property="og:description"
		content="AI-assisted CV with a chat that knows my work, projects, and how I think."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://melorga.pages.dev/" />
	<meta property="og:image" content="https://melorga.pages.dev/og-image.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Mariano Elorga — AWS Solutions Architect" />
	<meta
		name="twitter:description"
		content="AI-assisted CV with a chat that knows my work, projects, and how I think."
	/>
	<meta name="twitter:image" content="https://melorga.pages.dev/og-image.jpg" />
</svelte:head>

<slot />
```

- [ ] **Step 3: Verify**

```bash
pnpm check && pnpm build
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "refactor(layout): align theme-color with Confident Modern palette"
```

---

## Task 14: Remove Layer-2 legacy-class shims

**Files:**

- Modify: `src/app.css` — remove the `glass`, `neon-text`, `neural-bg`, `high-contrast` shim block.

- [ ] **Step 1: Open `src/app.css`**

Find the section labeled `Legacy class shims — TEMPORARY` (added in Layer 2 Task 7).

- [ ] **Step 2: Delete that entire block**

Remove from the comment `/* ----- Legacy class shims ----- */` down to the closing brace of `.high-contrast { /* No-op ... */ }`. The rest of the file (theme tokens, base layer, utilities, keyframes) stays.

- [ ] **Step 3: Verify nothing references those classes anymore**

```bash
grep -rn 'glass\|glass-dark\|neon-text\|neural-bg\|high-contrast' src/ 2>&1 || echo "clean"
```

Expected: `clean` (or zero matches in `src/`). Any matches need to be removed from the matching Svelte file.

- [ ] **Step 4: Build + test + smoke**

```bash
pnpm check && pnpm lint && pnpm build && pnpm test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/app.css
git commit -m "chore(css): remove temporary legacy-class shims"
```

---

## Task 15: Visual polish — motion + responsive

**Files:**

- Modify: `src/lib/components/ChatPanel.svelte` — refine animation timing.
- Modify: `src/lib/components/Sidebar.svelte` — mobile breakpoint.

- [ ] **Step 1: Stagger MessageBubble fade-in (already uses `animate-fade-in`)**

No-op if MessageBubble already uses `animate-fade-in` from `src/app.css`. The fade is applied per-bubble; new bubbles fade in naturally as they append.

- [ ] **Step 2: Make Sidebar collapsible on small screens**

In `src/lib/components/Sidebar.svelte`, the `<aside>` already has `md:w-72`. To make mobile usable, ensure the layout in `+page.svelte` stacks vertically below `md`. Open `src/routes/+page.svelte` and change the wrapper:

Find:

```svelte
<div class="flex min-h-screen w-full">
```

Replace with:

```svelte
<div class="flex min-h-screen w-full flex-col md:flex-row">
```

Also in `Sidebar.svelte`, change the `<aside>` opening to constrain its height on mobile:

Find in Sidebar.svelte:

```svelte
<aside
  class="flex h-full w-full flex-col gap-6 bg-canvas-deep border-r border-line p-6
         md:w-72 md:min-w-72"
>
```

Replace with:

```svelte
<aside
  class="flex w-full flex-col gap-6 bg-canvas-deep border-line p-6
         border-b md:border-b-0 md:border-r
         md:h-full md:w-72 md:min-w-72"
>
```

- [ ] **Step 3: Smoke test mobile width**

```bash
pnpm dev
```

Open http://localhost:5173. DevTools → toggle device toolbar → iPhone 12 width.

Expected: Sidebar stacks above ChatPanel; ChatPanel takes full width. Cmd+C.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/Sidebar.svelte
git commit -m "feat(responsive): stack sidebar above chat on mobile"
```

---

## Task 16: Full pipeline + spec coverage check

**Files:**

- None modified.

- [ ] **Step 1: Run everything**

```bash
pnpm validate && pnpm build && pnpm test && pnpm test:with-server
```

Expected: all green.

- [ ] **Step 2: Verify component inventory matches spec**

```bash
ls src/lib/components/
```

Expected to contain:

- `AuthGate.svelte`
- `BookingCta.svelte`
- `ChatPanel.svelte`
- `MessageBubble.svelte`
- `Sidebar.svelte`
- `SuggestionChips.svelte`
- `ThemeToggle.svelte`
- `__tests__/`

- [ ] **Step 3: Verify +page.svelte is genuinely thin**

```bash
wc -l src/routes/+page.svelte
```

Expected: under 60 lines.

- [ ] **Step 4: Confirm Calendly integration**

```bash
grep -n 'calendly' src/lib/components/*.svelte src/routes/+page.svelte
```

Expected: BookingCta uses the URL; +page.svelte preconnects/loads the widget.

- [ ] **Step 5: Final commit (only if any tweaks)**

```bash
git status
```

If clean, this task ends here. Otherwise:

```bash
git add -p
git commit -m "chore(layer-3): final polish"
```

---

## Done criteria for Layer 3

- ✅ `src/routes/+page.svelte` is ~30-50 lines, branches on `data.user`.
- ✅ Seven new components exist in `src/lib/components/`, each with passing tests.
- ✅ Calendly widget loads on both screens; `mailto:` fallback works when blocked.
- ✅ Sign-in error never reveals which field was wrong.
- ✅ Mobile (< md) stacks Sidebar above ChatPanel.
- ✅ All Layer-2 legacy shims removed.
- ✅ `pnpm deploy:check` and `pnpm test` pass.
- ✅ The site is visually the Confident Modern / Warm Orange design.

After this, the engineer hands off to Layer 4.
