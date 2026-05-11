# Layer 2 — Tailwind 4 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Tailwind CSS from v3 to v4. Move configuration from `tailwind.config.js` into `src/app.css` using the new `@theme { … }` directive. Replace the legacy neon/matrix/cyberpunk palette with the **Confident Modern / Warm Orange** palette. The redesign layout itself comes in Layer 3 — this layer changes only tokens and infrastructure.

**Architecture:** Tailwind 4 uses a new Vite plugin (`@tailwindcss/vite`) instead of the PostCSS plugin chain. Config moves from `tailwind.config.js` to CSS via `@theme`. The `@tailwind base/components/utilities` directives are replaced by a single `@import "tailwindcss"`. Custom utilities use `@utility`. Plugins are imported into CSS via `@plugin`. This layer also deletes the legacy cyberpunk CSS (`neural-bg`, `neon-text`, `glass`, `matrix-rain`, `transform-3d`, etc.) since the redesign in Layer 3 will not reference them.

**Tech Stack:** Tailwind 4.3, `@tailwindcss/vite`, `@tailwindcss/forms` 0.5.x, `@tailwindcss/typography` 0.5.x.

---

## File Structure

**Modified:**
- `package.json` — replace `tailwindcss` with `tailwindcss@^4` and `@tailwindcss/vite`; remove `@tailwindcss/cli` (replaced by Vite plugin); bump forms/typography plugins.
- `vite.config.ts` — add the new Tailwind Vite plugin.
- `postcss.config.js` — remove the `tailwindcss` and `autoprefixer` plugin entries (Tailwind 4 handles autoprefixing internally). If the file becomes empty, delete it.
- `src/app.css` — completely rewritten with the new `@theme` syntax and Warm Orange palette.

**Deleted:**
- `tailwind.config.js` — Tailwind 4 reads config from CSS.
- `postcss.config.js` — only if it becomes empty after the Tailwind/autoprefixer entries are removed.

**Untouched in this layer (Layer 3 handles them):**
- `src/routes/+page.svelte` — its old utility classes (like `bg-neon-blue`) will visually break after this layer. That's expected. Layer 3 replaces the file entirely.

---

## Task 1: Baseline check

**Files:**
- None modified.

- [ ] **Step 1: Confirm Layer 1 is complete**

```bash
git log --oneline -3
```

Expected: top commits relate to Layer 1 (deps bumps). If not, do Layer 1 first.

- [ ] **Step 2: Snapshot the visual baseline**

```bash
pnpm dev
```

Open http://localhost:5173. Take a screenshot of the landing page (Cmd+Shift+4 on macOS). Save to `/tmp/pre-tailwind4-landing.png` for visual comparison after migration. Cmd+C to stop.

- [ ] **Step 3: Confirm pipeline is green**

```bash
pnpm validate && pnpm build
```

Expected: green.

---

## Task 2: Install Tailwind 4 packages

**Files:**
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Remove old Tailwind packages**

```bash
pnpm remove tailwindcss @tailwindcss/cli
```

- [ ] **Step 2: Install Tailwind 4 + Vite plugin + updated plugins**

```bash
pnpm add -D tailwindcss@^4.3.0 @tailwindcss/vite@^4.3.0 @tailwindcss/forms@^0.5.11 @tailwindcss/typography@^0.5.19
```

- [ ] **Step 3: Confirm install**

```bash
cat package.json | grep -E '"tailwind|"@tailwindcss'
```

Expected output includes:
```
"@tailwindcss/forms": "^0.5.11",
"@tailwindcss/typography": "^0.5.19",
"@tailwindcss/vite": "^4.3.0",
"tailwindcss": "^4.3.0"
```

No `@tailwindcss/cli` line.

- [ ] **Step 4: Commit the install**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(tailwind): install tailwind 4 and @tailwindcss/vite"
```

---

## Task 3: Register the Tailwind Vite plugin

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Read current vite.config.ts**

```bash
cat vite.config.ts
```

Note the current `plugins` array contents.

- [ ] **Step 2: Add the Tailwind plugin**

Open `vite.config.ts`. At the top, add the import:

```ts
import tailwindcss from '@tailwindcss/vite';
```

Inside the `plugins: [ … ]` array of the `defineConfig({ … })`, add `tailwindcss()` **before** `sveltekit()`. The result should look like:

```ts
plugins: [
  tailwindcss(),
  sveltekit()
]
```

If the existing config uses a function form (`plugins: [tailwindcss(), sveltekit()]` as a one-liner), the addition is identical.

- [ ] **Step 3: Verify the file**

```bash
cat vite.config.ts
```

Expected: `import tailwindcss from '@tailwindcss/vite';` near the top, and `tailwindcss()` first in the plugins array.

- [ ] **Step 4: Type-check passes**

```bash
pnpm check
```

Expected: green.

---

## Task 4: Strip PostCSS Tailwind/autoprefixer plugins

**Files:**
- Modify or delete: `postcss.config.js`
- Modify: `package.json` — autoprefixer may now be unused.

Tailwind 4 vendors autoprefixing internally. If PostCSS is used for nothing else, the file can be deleted.

- [ ] **Step 1: Read current postcss config**

```bash
cat postcss.config.js
```

- [ ] **Step 2: Decide based on contents**

(a) If `postcss.config.js` only contains `tailwindcss` and `autoprefixer` plugins, delete the file:

```bash
rm postcss.config.js
```

Then remove `autoprefixer` from package.json:

```bash
pnpm remove autoprefixer
```

(b) If `postcss.config.js` contains additional plugins (e.g., `postcss-nested`), only remove the `tailwindcss` and `autoprefixer` entries from the plugins block; leave the rest. Keep `autoprefixer` installed only if explicitly used by another plugin.

For this repo, expect path (a).

- [ ] **Step 3: Verify build still works**

```bash
pnpm build
```

Expected: builds successfully. Tailwind output now comes via the Vite plugin.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts postcss.config.js package.json pnpm-lock.yaml
git commit -m "chore(tailwind): wire @tailwindcss/vite plugin and drop postcss tailwind chain"
```

(If `postcss.config.js` was deleted, the commit will show it as deleted.)

---

## Task 5: Delete the old `tailwind.config.js`

**Files:**
- Delete: `tailwind.config.js`

The file's content moves to CSS in Task 6 — but first we delete it to ensure the new build path is the only source.

- [ ] **Step 1: Capture the old config for reference**

```bash
cat tailwind.config.js > /tmp/old-tailwind-config.js
```

(This file is git history; this is just a convenience reference.)

- [ ] **Step 2: Delete it**

```bash
git rm tailwind.config.js
```

- [ ] **Step 3: Confirm build still works (expects no Tailwind output yet — that's Task 6)**

```bash
pnpm build
```

Expected: builds. Tailwind utilities won't be generated yet (app.css still has the v3 `@tailwind` directives), but the build doesn't error. If it does fail with "could not find tailwind.config.js", that means the Vite plugin is looking for it — make sure Task 3 added the plugin correctly.

---

## Task 6: Rewrite `src/app.css` with Tailwind 4 syntax + new palette

**Files:**
- Modify: `src/app.css` — complete rewrite.

This is the heart of Layer 2. Everything else flows from this file.

- [ ] **Step 1: Read the current app.css for reference**

```bash
cat src/app.css
```

Note the legacy keyframes (`float`, `glow`, `matrix-rain`) and utility classes (`neural-bg`, `neon-text`, `glass`, `transform-3d`, etc.). These are ALL deleted.

- [ ] **Step 2: Replace the file**

Overwrite `src/app.css` with exactly this content:

```css
@import "tailwindcss";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";

/* --------------------------------------------------------------
 * Confident Modern / Warm Orange theme tokens
 * Set via Tailwind v4 @theme. Available as `bg-canvas`, `text-fg`,
 * `text-accent`, `border-line`, etc.
 * ------------------------------------------------------------ */
@theme {
  /* Canvas + foreground */
  --color-canvas: #111111;          /* near-black main bg */
  --color-canvas-elevated: #1a1a1a; /* card/input bg */
  --color-canvas-deep: #0a0a0a;     /* sidebar bg */
  --color-fg: #f5f5f4;              /* primary text */
  --color-fg-muted: #a8a29e;        /* secondary text */
  --color-fg-subtle: #6b7280;       /* tertiary text */
  --color-line: #2a2a2a;            /* borders */
  --color-line-strong: #3a3a3a;     /* focused/hovered borders */

  /* Accent: Warm Orange */
  --color-accent: #ff8a4c;
  --color-accent-hover: #ff7a36;
  --color-accent-soft: rgb(255 138 76 / 0.16); /* glow tint */
  --color-on-accent: #111111;       /* text color on accent buttons */

  /* Typography */
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", Consolas, monospace;

  /* Spacing scale (Tailwind defaults are kept; we only add semantic aliases) */
  --spacing-section: 4rem;

  /* Radii */
  --radius-pill: 9999px;

  /* Motion */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}

/* --------------------------------------------------------------
 * Base layer — minimal, no cyberpunk legacy.
 * Default colors apply to <html> so theme is global.
 * ------------------------------------------------------------ */
@layer base {
  html {
    background-color: var(--color-canvas);
    color: var(--color-fg);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  body {
    min-height: 100vh;
    background-color: var(--color-canvas);
    color: var(--color-fg);
  }

  /* Default focus ring uses the accent */
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: 2px;
  }

  /* Selection styles */
  ::selection {
    background-color: var(--color-accent);
    color: var(--color-on-accent);
  }
}

/* --------------------------------------------------------------
 * Custom utilities (replaces the legacy @apply / arbitrary CSS)
 * ------------------------------------------------------------ */
@utility hero-glow {
  /* Subtle radial accent behind hero sections */
  background-image: radial-gradient(
    ellipse at top right,
    var(--color-accent-soft),
    transparent 60%
  );
}

@utility scrollbar-thin {
  /* Restrained custom scrollbar for chat list, sidebar */
  scrollbar-width: thin;
  scrollbar-color: var(--color-line-strong) transparent;
}

@utility scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

@utility scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--color-line-strong);
  border-radius: 3px;
}

@utility scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

/* --------------------------------------------------------------
 * Motion keyframes (Layer-3 components reference these)
 * ------------------------------------------------------------ */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes accent-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-12px, 8px) scale(1.05); }
}

@utility animate-fade-in {
  animation: fade-in var(--duration-normal) var(--ease-out-soft) both;
}

@utility animate-accent-drift {
  animation: accent-drift 8s var(--ease-out-soft) infinite;
}
```

- [ ] **Step 3: Confirm content**

```bash
head -5 src/app.css
```

Expected first line: `@import "tailwindcss";`. No `@tailwind` directives.

- [ ] **Step 4: Build it**

```bash
pnpm build
```

Expected: builds successfully. The build output should reference the new tokens.

- [ ] **Step 5: Smoke-test dev server**

```bash
pnpm dev
```

Open http://localhost:5173. **Expected state of the page:**

- The page renders with the near-black `#111` canvas.
- Existing utility classes from the old design (e.g., `bg-neon-blue`, `glass`, `neon-text`, `matrix-rain`) no longer apply — anything in `+page.svelte` referencing them will appear unstyled or use default browser styles.
- This is **EXPECTED** and **CORRECT**. Layer 3 replaces `+page.svelte` entirely.

Open DevTools → Console. Expected: zero CSS-related errors. Cmd+C to stop.

- [ ] **Step 6: Commit**

```bash
git add src/app.css tailwind.config.js
git commit -m "feat(tailwind): migrate to v4 with @theme; replace cyberpunk palette with Confident Modern / Warm Orange"
```

---

## Task 7: Add legacy-class deprecation notes (defensive)

**Files:**
- Modify: `src/app.css` — add a `@supports`-gated fallback so the visually-broken Layer-2 intermediate state doesn't look catastrophic if someone deploys mid-migration.

This step is optional but recommended.

- [ ] **Step 1: Append a graceful-degradation block at the end of `src/app.css`**

Add to the bottom of `src/app.css`:

```css
/* --------------------------------------------------------------
 * Legacy class shims — TEMPORARY
 * Layer 2 deletes the cyberpunk palette; legacy class refs in
 * +page.svelte are removed in Layer 3. These shims keep the
 * page from looking broken if Layer 3 hasn't shipped yet.
 * REMOVE these once Layer 3 lands.
 * ------------------------------------------------------------ */
.glass,
.glass-dark {
  background-color: var(--color-canvas-elevated);
  border: 1px solid var(--color-line);
}

.neon-text {
  color: var(--color-accent);
  text-shadow: none;
}

.neural-bg {
  background-color: var(--color-canvas);
}

.high-contrast {
  /* No-op — new palette already meets AA. Removed in Layer 3. */
}
```

- [ ] **Step 2: Confirm dev page no longer looks catastrophic**

```bash
pnpm dev
```

Open http://localhost:5173. Expected: page is dark `#111`, no glowing neon, no cyberpunk effects, but readable. Form fields render. Cmd+C.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "feat(tailwind): temporary shims for legacy classes (removed in Layer 3)"
```

---

## Task 8: Verify build output uses new tokens

**Files:**
- None modified (verification).

- [ ] **Step 1: Inspect built CSS**

```bash
pnpm build
ls .svelte-kit/output/client/_app/immutable/assets/ 2>/dev/null | grep -i css | head -5
```

Find the largest CSS file. Open it (path varies by build; one example):

```bash
cat .svelte-kit/output/client/_app/immutable/assets/*.css | head -100
```

Expected: contains the orange `#ff8a4c` value and references the new `--color-canvas` token. Does NOT contain `#00D4FF` (old neon blue), `#39FF14` (old matrix green), `#9D4EDD` (old neon purple), or the keyframe name `matrix-rain`.

- [ ] **Step 2: Grep for legacy palette leakage**

```bash
grep -r "00D4FF\|39FF14\|9D4EDD\|FF073A\|0D1117\|00FF41" .svelte-kit/output/ 2>&1 | head -10
```

Expected: zero matches. If any match, hunt them down — they're either in a Svelte component's `<style>` block (Layer 3 cleanup) or in an unimported leftover.

- [ ] **Step 3: Grep for legacy keyframes**

```bash
grep -r "matrix-rain\|@keyframes float\|neural-bg" src/ 2>&1
```

Expected: zero matches (in `src/`). The shim file references `.neural-bg` as a class but should NOT define `@keyframes neural-rain` etc.

---

## Task 9: Full pipeline check + commit milestone

**Files:**
- None modified.

- [ ] **Step 1: Full pipeline**

```bash
pnpm deploy:check
```

Expected: passes through `validate`, `build`, and `test:with-server`.

- [ ] **Step 2: Visual diff vs the baseline screenshot from Task 1**

Open the Task-1 screenshot and the current page side by side. **Expected differences:**

- All neon glows gone.
- Backgrounds are uniform `#111`.
- Form inputs revert to browser defaults (acceptable — Layer 3 styles them).
- Theme toggle still works mechanically (but the high-contrast filter no longer fires).
- Chat area unstyled but functional.

These differences are EXPECTED and correct.

- [ ] **Step 3: Final layer-2 commit (only if anything else needs cleanup)**

```bash
git status
```

If clean, no further commit needed. Otherwise:

```bash
git add -p
git commit -m "chore(tailwind): final layer-2 cleanup"
```

- [ ] **Step 4: Confirm layer-2 history**

```bash
git log --oneline | head -10
```

Expected: ~5-6 layer-2 commits sitting on top of layer-1.

---

## Done criteria for Layer 2

- ✅ Tailwind 4 is installed and configured via `@tailwindcss/vite`.
- ✅ `tailwind.config.js` is deleted.
- ✅ `postcss.config.js` is deleted or stripped of Tailwind/autoprefixer.
- ✅ `src/app.css` uses `@import "tailwindcss"` and `@theme { … }` syntax with the Warm Orange palette.
- ✅ No legacy palette colors leak into the built output.
- ✅ `pnpm deploy:check` passes.
- ✅ Site renders (intentionally unstyled in places — Layer 3 fixes that).

After this, the engineer hands off to Layer 3.
