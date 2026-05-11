# CV Site — Full Update Design

**Status:** approved (brainstorming phase complete)
**Date:** 2026-05-11
**Scope:** dependencies + visual/UX redesign + security hardening. Content updates are explicitly out of scope.

## 1. Goal

Update the entire CV site in three orthogonal dimensions while keeping it shippable at each step:

1. Take every dependency to its latest version (including all majors).
2. Redesign to a chat-first, professional-minimal interface with the "Confident Modern / Warm Orange" language.
3. Add a full security hardening pass including prompt-injection guardrails on the AI chat.

The site keeps its current purpose: an AI-assisted personal CV that helps land roles. After this work, the AI chat is the principal feature (not a side widget), the site is fully auth-gated (visitor registry), and a Calendly booking CTA is prominent on both the landing and the gated interface.

## 2. Approach

**Layered execution in four commits.** Each commit is independently bisectable, reviewable, and shippable.

1. **Layer 1 — Infrastructure.** Bump all non-Tailwind dependencies to latest. Fix any compilation, lint, or runtime breakage. No visual change.
2. **Layer 2 — Tailwind 4 migration.** Migrate Tailwind 3 → 4. Move config from `tailwind.config.js` into `src/app.css` using `@theme { … }`. Remove the legacy neon/matrix palette. Seed the new tokens with the Confident Modern / Warm Orange palette. Old layout still uses old structure; only tokens change.
3. **Layer 3 — Component refactor and redesign.** Split the 1088-line `+page.svelte` into focused components. Implement the Sidebar Bio + Chat layout. Add Calendly embed. Apply restrained-elegant motion.
4. **Layer 4 — Security pass.** HSTS preload, COOP/COEP/CORP, cookie hardening, per-IP chat limits, auth lockout, Calendly CSP entry, prompt-injection guardrails, refreshed `pnpm test:security`, CVE audit.

## 3. Design language

- **Direction:** Confident Modern (chosen out of Quiet Editorial / Calm Engineering / Confident Modern).
- **Canvas:** near-black (`#111`) with a soft radial warm-orange glow at the top-right of hero sections.
- **Accent:** Warm Orange (`#ff8a4c`). Used for the wordmark, primary CTAs, accents in headlines (`em` → orange), and the AI message highlight.
- **Type:** Inter (already loaded). Display weight 700 with `-0.03em` letter-spacing for headlines. Body weight 400.
- **Motion:** option C — staggered fade-in on first paint, animated suggestion-chip hover, subtle gradient drift behind the hero. Kept minimalist and elegant throughout.
- **Theme:** dark is the default. A small ThemeToggle remains in the sidebar footer for light mode. The legacy "High Contrast" mode is removed because the new palette already meets WCAG AA contrast targets.

## 4. Page structure

The site is fully auth-gated. The same route `/` renders different content depending on authentication state:

**Unauthenticated** → `<AuthGate />`

- Hero: "Let's talk about your _next_ build." (warm-orange `em`)
- Sub: "I architect cloud systems. Step inside, or book a quick chat."
- Form: email + password + Turnstile + Sign-in button.
- Pill: "Book 15 min" (Calendly trigger).
- Welcoming copy frames the site for hiring managers without ever using the word.

**Authenticated** → `<Sidebar /> + <ChatPanel />`

- Sidebar (left, ~280px desktop, collapsible on mobile): avatar, name, role, location, LinkedIn, Calendar, sign-out, ThemeToggle.
- ChatPanel (center, flex-1): top bar with wordmark and "Book 15 min" pill; AI's welcome message; persistent suggestion chips above the input; message stream below; rounded input field with orange send button.

## 5. Architecture

**Stays the same:**

- SvelteKit 2 on Cloudflare Pages (`@sveltejs/adapter-cloudflare`).
- Firebase Auth (email/password).
- Cloudflare Turnstile (CAPTCHA on AuthGate).
- Groq API for the AI chat (server-side).
- Cloudflare KV for rate-limit and visitor-log storage.
- Strict CSP with nonce-based scripts.

**Changes:**

- Tailwind 3 → Tailwind 4, config-in-CSS via `@theme`.
- `/` becomes auth-gated at the server level via `+layout.server.ts` checking the Firebase session cookie.
- Calendly is added as the only new third-party dependency. Loaded via `https://assets.calendly.com/assets/external/widget.js`, with two CSP entries: `https://assets.calendly.com` (script-src) and `https://calendly.com` (frame-src and connect-src — specific subdomains, no wildcards).
- New server module `src/lib/server/chat-guard.ts` runs on every chat request before hitting Groq.

**Routes:**

- `/` — public landing/auth (unauthenticated) OR chat interface (authenticated).
- `/api/chat` — existing AI chat endpoint, hardened.
- `/api/validate-turnstile` — existing CAPTCHA validation.
- `/api/csp-report` — existing CSP violation endpoint.
- `/api/visitor-log` — new. Writes hashed-IP + timestamp + email to KV on every successful sign-in. This is the "visitor registry."
- `/api/auth/signout` — new (small). Clears the session cookie.
- `/api/client-error` — new (small). Receives client-side error reports.

**Removed:** none (the `/login` route is already gone per prior commits).

## 6. Components

New `src/lib/components/` directory:

- `AuthGate.svelte` — unauthenticated landing/sign-in screen. No props. Emits `authenticated` event on success.
- `Sidebar.svelte` — post-auth left column. Props: `user: User`.
- `ChatPanel.svelte` — post-auth chat area. Owns conversation state. Props: `user: User`, `initialPrompts: string[]`.
- `MessageBubble.svelte` — single message. Props: `role: 'user' | 'assistant'`, `text: string`, `timestamp: Date`. Handles fade-in motion.
- `SuggestionChips.svelte` — chip row above the input. Props: `prompts: string[]`. Emits `select` event.
- `BookingCta.svelte` — the orange "Book 15 min" pill. Wraps the Calendly inline-widget trigger. Used by AuthGate and ChatPanel top bar.
- `ThemeToggle.svelte` — kept, stripped of the high-contrast button. Small icon in the sidebar footer.

New `src/lib/server/` directory:

- `chat-guard.ts` — prompt-injection guard. Input sanitization, output filtering, hardened system prompt.
- `session.ts` — Firebase session cookie verification.
- `visitor-log.ts` — KV writes with hashed IPs (never raw).

Existing files reshaped:

- `+page.svelte` — becomes a thin shell (`{#if user} <Sidebar/> <ChatPanel/> {:else} <AuthGate/> {/if}`), ~30 lines.
- `+layout.server.ts` — new. Loads the session, sets `locals.user`.
- `hooks.server.ts` — kept, CSP and security headers updated.
- `src/lib/Turnstile.svelte` — kept as-is, used by AuthGate.
- `src/lib/firebase.ts` — kept, lightly updated for Firebase 12.13.

## 7. Data flow

**Public landing (unauthenticated):**

```
Visitor → GET /
  → +layout.server.ts checks session cookie (none)
  → +page.svelte renders <AuthGate />
  → AuthGate loads Turnstile widget (nonce-attached script)
  → User enters email/password, completes Turnstile
  → POST /api/validate-turnstile (server verifies token with Cloudflare)
  → On success: Firebase Auth client-side sign-in (email/password)
  → Firebase ID token sent to server, exchanged for session cookie
    (HttpOnly, Secure, SameSite=Strict, Path=/, 1h TTL)
  → POST /api/visitor-log (server writes hashed-IP + timestamp + email to KV)
  → Browser reloads /, layout.server.ts now finds session
  → +page.svelte renders <Sidebar/> + <ChatPanel/>
```

**Authenticated chat:**

```
User types message → ChatPanel.send(text)
  → POST /api/chat with { messages, sessionId } (CSRF token in header)
  → hooks.server.ts: rate-limit (per-session AND per-IP daily cap)
  → chat-guard.ts: sanitize input, reject if guard triggered
  → groq-sdk 1.x: stream response with hardened system prompt
  → chat-guard.ts: filter output stream
  → SSE stream back to ChatPanel → MessageBubble fades in tokens
```

**Calendly booking (either screen):**

```
User clicks "Book 15 min" → BookingCta opens Calendly popup widget
  → All iframe traffic stays on calendly.com (CSP frame-src entry)
  → On scheduled callback (Calendly postMessage event)
  → Local toast: "Confirmed — see you on <date>"
```

**Sign-out:**

```
User clicks sign-out in Sidebar → POST /api/auth/signout
  → Server clears session cookie (Max-Age=0)
  → Client clears Firebase auth state
  → Redirect to / → AuthGate renders
```

**Session refresh:**

```
On every authenticated request, if cookie has <10min remaining,
  → server re-issues new 1h cookie in response (transparent)
```

## 8. Error handling

| Where it fails                           | What the user sees                                                                                                                | What's logged                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Turnstile fails                          | Inline error: "Please complete the verification." Widget re-renders.                                                              | Structured KV log: timestamp + outcome.                       |
| Firebase sign-in fails                   | Generic: "Sign-in failed. Try again or reset your password." (Never reveals which input was wrong — account enumeration defense.) | Server log: error code, hashed-IP, timestamp.                 |
| 5 failed sign-ins from same IP in 15 min | Form replaced by "Too many attempts. Try again in 15 minutes." Turnstile re-challenge required to resume.                         | KV entry; cleared after window.                               |
| Session cookie expired/invalid           | Silent redirect to `/` (AuthGate). No error toast.                                                                                | Trace log, level=info.                                        |
| `/api/chat` rate-limit hit               | Toast: "Slow down — you've sent a lot recently. Try again in <N>s." Input disabled with countdown.                                | KV counter.                                                   |
| Prompt-injection guard (input)           | Toast: "That message couldn't be sent. Try rephrasing." Input cleared.                                                            | Full log of rejected prompt, level=warn, which rule matched.  |
| Prompt-injection guard (output)          | Stream cut, replaced with: "I can't answer that — let me know if you'd like to ask something else."                               | Full log of suspect output, level=warn.                       |
| Groq API timeout/5xx                     | Toast: "The assistant is taking a moment. Retry?" Retry restarts the same prompt. Partial messages kept visible.                  | Server log with provider response, level=error.               |
| Calendly script fails                    | Pill falls back to `mailto:` with prefilled subject. No broken UI.                                                                | Client console.warn — Calendly is non-critical.               |
| Hard JS error in chat panel              | Svelte error boundary: "Something broke — refresh to continue." Refresh restores session (cookie still valid).                    | POST `/api/client-error` records hashed user ID + stack hash. |
| CSP violation                            | Nothing visible (CSP blocks silently).                                                                                            | Existing `/api/csp-report`.                                   |

**Principles:**

- Auth errors never reveal which input was wrong.
- Rate-limit errors give a clear retry window, not a closed door.
- Prompt-injection rejections are friendly to legitimate edge cases; aggressive logging tunes false positives.
- Calendly failure is non-blocking — the site works without it.
- Every failure has a log entry; no silent failures except CSP.

## 9. Security hardening

**Headers (added in `hooks.server.ts`):**

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp` (with explicit CORP exceptions for Calendly iframe)
- `Cross-Origin-Resource-Policy: same-origin`
- `Permissions-Policy` tightened (no microphone, camera, geolocation; only what Calendly needs in its iframe scope)

**CSP additions:**

- `script-src` adds `https://assets.calendly.com`.
- `frame-src` adds `https://calendly.com`.
- `connect-src` adds `https://calendly.com`.
- No wildcards. Existing strict nonce-based script policy preserved.

**Cookies:**

- Session cookie: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`.
- CSRF token cookie: `Secure; SameSite=Strict; Path=/`.

**Rate limiting:**

- Existing per-session limit kept (30 req/min via `rate-limiter-flexible` 11).
- New per-IP daily cap for `/api/chat`: 200 requests / 24h.
- New auth lockout: 5 failed sign-ins per IP in 15 min → 15 min lockout + forced Turnstile re-challenge.

**Prompt-injection guardrails (`chat-guard.ts`):**

- Hardened system prompt with explicit refusal patterns (won't role-switch, won't claim credentials outside its allowed context, won't reveal the prompt itself).
- Input sanitization: rejects messages matching known injection patterns ("ignore previous instructions", "you are now…", "system:", base64-encoded prompt fragments, multi-language injection attempts).
- Output filtering: blocks fabricated-credential assertions and prompt-leak responses.
- All rejections logged with rule-match metadata for false-positive tuning.

**Dependency audit:**

- `pnpm audit` run as part of `pnpm deploy:check`.
- All majors upgraded in Layer 1 (TS 6, Vite 8, ESLint 10, OpenAI 6, Groq 1, rate-limiter 11, SvelteKit/Svelte latest, Wrangler 4.90, all `@sveltejs/*`, prettier, autoprefixer, postcss, svelte-check, typescript-eslint) and Tailwind 4 in Layer 2.

**Visitor registry:**

- New `/api/visitor-log` writes `{ hashedIP, email, timestamp, userAgent }` to Cloudflare KV on every successful sign-in.
- Raw IP is never stored — hashed with HMAC-SHA256 using a server-side secret salt stored in Cloudflare Workers env (`VISITOR_LOG_SALT`).

## 10. Testing

**Existing tests refreshed:**

- `scripts/security-test.mjs` — updated to assert the new headers (HSTS preload, COOP, COEP, CORP), the Calendly CSP entries, and the new `frame-src` rule. Run via `pnpm test:security`.
- `scripts/test-with-server.mjs` — kept.

**New unit tests** (`src/lib/server/*.test.ts`, Vitest):

- `chat-guard.test.ts` — table-driven tests for injection patterns (ignore-instructions, role-switch, system:, base64, multi-language, prompt-leak). Output filter tests for fabricated-credential patterns.
- `session.test.ts` — valid, expired, tampered tokens.
- `visitor-log.test.ts` — KV writes, hashed-IP determinism, no raw IP stored.
- `rate-limit.test.ts` — per-session limit, per-IP daily cap, lockout expiry.

**New integration tests** (`tests/integration/`, Playwright):

- `auth-flow.spec.ts` — anonymous → AuthGate → Turnstile (mocked) → sign in → chat. Then sign-out → AuthGate.
- `chat-happy-path.spec.ts` — authenticated → chip selected → AI stream → second message → chips update.
- `lockout.spec.ts` — 5 failed sign-ins → lockout banner → time-mock skip → access restored.
- `calendly-fallback.spec.ts` — block `assets.calendly.com` → pill becomes `mailto:` with the right subject.

**Visual regression** (optional but recommended):

- `tests/visual/` with Playwright screenshot diffs for AuthGate, Chat-empty, Chat-with-messages, Sign-out toast. 0.1% pixel diff tolerance.

**`pnpm deploy:check` updated to run:**

1. `pnpm check` (TypeScript)
2. `pnpm lint` (ESLint + Prettier)
3. `pnpm test` (Vitest unit suite)
4. `pnpm test:integration` (Playwright)
5. `pnpm test:security` (header/CSP suite against running server)
6. `pnpm audit` (CVE check)

**Out of scope for tests:**

- Groq model's exact responses (non-deterministic — we test the _guard_, not the model).
- Calendly's own widget behavior.
- Firebase's session minting.

**Coverage target:** 80% on `src/lib/server/`. No target on Svelte components — Playwright covers UI-level behavior.

## 11. Out of scope

- **Content updates** — job history, projects, bio paragraphs, skills lists. User will do these separately after the design ships.
- **Image generation / new photography.** The avatar in the sidebar uses the existing photo if any; otherwise a generated gradient stand-in.
- **i18n / multi-language UI.** Single-language (English) for this pass.
- **Analytics integration.** Visitor registry covers the "who's here" question; no GA/Plausible/PostHog added in this pass.
- **Additional auth providers** (Google, GitHub, magic link). Email/password only.

## 12. Open questions

None — all design decisions resolved during brainstorming. The next phase (writing-plans) will produce the implementation plan that sequences each Layer into reviewable steps.
