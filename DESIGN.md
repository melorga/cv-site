---
name: Melorga CV
description: Personal CV with AI chat. Warm-orange light on a near-black workshop.
colors:
  hearth-orange: '#ff8a4c'
  hearth-orange-hover: '#ff7a36'
  hearth-orange-soft: '#ff8a4c29'
  on-hearth: '#111111'
  studio-black: '#111111'
  workshop-dusk: '#0a0a0a'
  bench-slate: '#1a1a1a'
  workbench-cream: '#f5f5f4'
  sawdust: '#a8a29e'
  cold-pewter: '#6b7280'
  joist: '#2a2a2a'
  plank: '#3a3a3a'
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: 'clamp(2.25rem, 4vw, 3rem)'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.03em'
  headline:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 'clamp(1.875rem, 3vw, 2.5rem)'
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: '-0.03em'
  title:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 500
    letterSpacing: '0.08em'
  wordmark:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 800
    letterSpacing: '0.2em'
rounded:
  sm: '6px'
  md: '8px'
  lg: '14px'
  pill: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  section: '64px'
components:
  button-primary:
    backgroundColor: '{colors.hearth-orange}'
    textColor: '{colors.on-hearth}'
    rounded: '{rounded.pill}'
    padding: '12px 22px'
  button-primary-hover:
    backgroundColor: '{colors.hearth-orange-hover}'
    textColor: '{colors.on-hearth}'
    rounded: '{rounded.pill}'
    padding: '12px 22px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.workbench-cream}'
    rounded: '{rounded.pill}'
    padding: '8px 16px'
  chip:
    backgroundColor: '{colors.bench-slate}'
    textColor: '{colors.sawdust}'
    rounded: '{rounded.pill}'
    padding: '6px 12px'
  chip-hover:
    backgroundColor: '{colors.bench-slate}'
    textColor: '{colors.workbench-cream}'
    rounded: '{rounded.pill}'
    padding: '6px 12px'
  input:
    backgroundColor: '{colors.bench-slate}'
    textColor: '{colors.workbench-cream}'
    rounded: '{rounded.sm}'
    padding: '8px 12px'
  message-user:
    backgroundColor: '{colors.hearth-orange}'
    textColor: '{colors.on-hearth}'
    rounded: '{rounded.lg}'
    padding: '8px 14px'
  message-assistant:
    backgroundColor: '{colors.bench-slate}'
    textColor: '{colors.workbench-cream}'
    rounded: '{rounded.lg}'
    padding: '8px 14px'
  send-button:
    backgroundColor: '{colors.hearth-orange}'
    textColor: '{colors.on-hearth}'
    rounded: '{rounded.pill}'
    size: '32px'
---

# Design System: Melorga CV

## 1. Overview

**Creative North Star: "The Warm Workshop"**

A craftsperson's room after sunset. Near-black walls, one warm lamp on
the workbench, tools laid out with care. The warmth is hospitality; the
dark is focus. The visitor is invited in (the AuthGate copy literally
says "step inside") to see how the work gets made, instead of being
handed a marketing brochure about it.

The accent orange is the lamp light: rare, concentrated, and the source
of every highlight on the screen. The dark canvas is the studio walls,
quiet and uniform so the work has somewhere to live. Body copy is the
chalk on the workbench, secondary but legible. Nothing in the room is
decorative without a reason. Tools have weight.

This system rejects four well-trodden aesthetics that the site is **not**
(quoting PRODUCT.md): the generic SaaS landing (gradient hero, three
feature cards, testimonial carousel), the boring résumé PDF in HTML
(header / experience / skills / education in a single column), the
crypto / web3 neon aesthetic (neon-on-black, gradient mesh, glowing
buttons), and the glass-morphic 2021 dashboard (frosted blur cards,
pastel gradients, drop-shadow stacks). The workshop is none of those.
It is a room where someone makes things on purpose.

**Key Characteristics:**

- One source of warmth per screen. Lit from a single lamp, not many.
- Tools have weight: borders are real, type is set tight, nothing
  decorative is loose on the bench.
- Flat by default. The room is one floor, not a stack of cards.
- Hospitality without ornament. The copy invites; it does not perform.
- Restraint signals seniority. If something can be dropped without
  losing meaning, it is dropped.

## 2. Colors: The Hearth Palette

A near-monochrome studio lit by one warm lamp. Every neutral is tinted
toward the lamp (never true `#000` or `#fff`); the single saturated
color is the lamp itself.

### Primary

- **Hearth Orange** (`#ff8a4c`, OKLCH approx. `oklch(75% 0.15 50)`): the
  single warm light in the room. Used on the primary CTA pill, the focus
  ring, the user message bubble, the italic emphasis in the hero
  headline, the avatar gradient, and the send button. Never appears as a
  decorative background flood; always as light arriving on a specific
  object.
- **Hearth Orange Hover** (`#ff7a36`): the lamp turned a quarter brighter
  on interaction. Used on `:hover` for the primary CTA and the send
  button.
- **Hearth Orange Soft** (`#ff8a4c29`, ~16% alpha): the spill of light
  near the lamp. Used in the AuthGate `hero-glow` radial gradient
  (top-right) and the focus ring's outer offset. Not a fill color.

### Neutral

- **Studio Black** (`#111111`): the studio walls. The default page
  background and the `on-accent` text color (text *on* the orange CTA
  pill). Reads as black at a glance, but it's tinted just shy of pure.
- **Workshop Dusk** (`#0a0a0a`): the deepest corner of the room. Used for
  the sidebar surface, one shade darker than the main canvas, to feel
  slightly recessed from the main bench.
- **Bench Slate** (`#1a1a1a`): the workbench surface. Used for raised
  inputs, the assistant message bubble, suggestion chip backgrounds, and
  any other element that should read as "set down on the bench" rather
  than "carved out of the wall".
- **Workbench Cream** (`#f5f5f4`): the chalk on the wood. Primary
  foreground text color. Slightly off-white, warm-tinted, so it never
  feels clinical.
- **Sawdust** (`#a8a29e`): the secondary, less-loud voice. Used for
  paragraph copy, sidebar tagline, chip default text. Always passes WCAG
  AA at body size against Studio Black.
- **Cold Pewter** (`#6b7280`): the tertiary voice. Form labels,
  placeholders, the "Signed in as" line in the sidebar footer. Used
  sparingly. If you read body copy in Cold Pewter, the contrast hierarchy
  is wrong.
- **Joist** (`#2a2a2a`): structural lines. Borders on inputs, dividers
  between sidebar and chat, the top rule under the sidebar nav.
- **Plank** (`#3a3a3a`): structural lines under attention. Borders on
  hovered or focused inputs, the chat input field on focus-within (just
  before the accent ring takes over).

### Named Rules

**The One Lamp Rule.** Hearth Orange appears on no more than 10% of any
given screen surface. Each screen has exactly one primary warm source
(the CTA pill, or the hero italic, or the user bubble in a long
thread). If two compete on the same screen, one must dim to the ghost
treatment.

**The Tinted Neutral Rule.** Never `#000`, never `#fff`. Studio Black
and Workbench Cream are both tinted toward the lamp by a hair. The two
pure values look clinical against the warm accent; the tinted values
look like the lamp light has been in the room for a while.

**The Lamp Is Always a Verb.** Hearth Orange marks *action* or *who is
speaking*, never *which section of the page this is*. Section headings
do not get orange. The italic emphasis on a single word ("your *next*
build") does. The user's own message bubble does. A section divider
does not.

## 3. Typography

**Display + Body Font:** Inter (with `system-ui, -apple-system, 'Segoe
UI', sans-serif` as fallback). One family carries display, headline,
title, body, label, and wordmark, held together by weight contrast and
tracking instead of by font pairing.

**Character:** Inter is a workhorse, not an accent. Chosen for its
functional clarity at small sizes (form labels, chips) and its tight
geometric weight at display sizes (the AuthGate hero). At weight 800
with -0.03em tracking it reads as stamped, almost like wood-burned
letterforms; at weight 400 with 1.55 line-height it disappears into the
page so the content speaks.

### Hierarchy

- **Display** (weight 800, `clamp(2.25rem, 4vw, 3rem)`, line-height
  0.95, tracking -0.03em): the AuthGate hero headline only. "Let's talk
  about your *next* build."
- **Headline** (weight 800, `clamp(1.875rem, 3vw, 2.5rem)`, line-height
  1.05, tracking -0.03em): the empty-state hero inside the chat panel.
  "Ask me **anything**."
- **Title** (weight 600, 0.875rem, line-height 1.2): the sidebar
  identity (profile name). Small, but heavier than body so it reads as
  a heading inside the sidebar's tight column.
- **Body** (weight 400, 0.875rem, line-height 1.55): paragraphs, the
  chat intro line, message bubbles. Max width capped at 65-75ch where
  rendered as paragraphs.
- **Label** (weight 500, 0.6875rem, uppercase, tracking 0.08em): form
  field labels, micro-headings ("Signed in as", "Just want to chat?").
  The all-caps + wide tracking signals "label" the way a piece of
  masking tape labels a drawer.
- **Wordmark** (weight 800, 0.75rem, uppercase, tracking 0.2em): the
  "M · E" mark, used on the AuthGate header. Reads as a stamped logo,
  not as type.

### Named Rules

**The Tight Type Rule.** Display and headline are set at -0.03em
tracking. There is no looseness in the loudest type. The loud type
works because it's compressed, not because it's big.

**The Three Sizes Rule.** Most screens use display *or* headline, plus
body, plus label. Three sizes. Title is reserved for the sidebar
identity slot. If you reach for a fourth size mid-screen, the layout is
overcomplicated.

## 4. Elevation

The workshop is a single room. There is no stack of floors, no
hovering cards, no overlapping glass. Surfaces are flat at rest.

The one exception is the **hero-glow** utility on the AuthGate (a soft
radial gradient of Hearth Orange Soft, anchored to the top-right
corner), which is the lamp itself spilling onto the wall. It is not a
shadow, not depth, not elevation. It is light.

The codebase has no `box-shadow` rules on cards, buttons, inputs, or
sidebar. Hover states use color and border shifts; focus states use a
2px solid Hearth Orange outline (via `:focus-visible`), offset by 2px.
That outline is technically depth-adjacent but reads as "this is lit
right now", not "this is floating".

### Named Rules

**The Flat Bench Rule.** Surfaces are flat. The only depth signal
allowed is the AuthGate `hero-glow` (the lamp on the wall) and the
focus-visible outline (the moment the lamp catches this object). If a
new component needs a drop-shadow to read, the layout is wrong;
redesign the layout.

**The Hover Is Color, Not Lift.** Hover treatments shift border color,
text color, or background tint. They never animate `box-shadow`, never
add `transform: translateY()`, never apply `filter: brightness()`.

## 5. Components

### Buttons

Two flavors carry every action: the **workshop hammer** (primary, solid
orange pill) and the **chalk mark** (ghost, transparent with a Plank
border).

- **Shape:** pill (`rounded.pill` = 9999px) for both variants. No
  square buttons, no soft-rounded rectangles.
- **Primary (the hammer):** Hearth Orange background, Studio Black
  text, weight 600, padding 12px 22px on standard buttons and 16px
  32px on the big AuthGate "Sign in" CTA. Hover shifts background to
  Hearth Orange Hover. Used for the loudest action on the screen (one
  per screen).
- **Ghost (the chalk):** transparent background, Workbench Cream text,
  1px Plank border, weight 500, padding 8px 16px. Hover shifts the
  border to Hearth Orange. Used for "and" actions: the secondary Book
  CTA on the AuthGate, the mode toggle ("Create account" / "Already
  have one? Sign in").
- **Send button:** 32x32 circle, Hearth Orange background, dark
  arrow-up SVG icon (2.5 stroke). Disabled at 40% opacity. The one
  workshop signal: hit it and the message goes up the channel.

### Suggestion Chips

The prompts laid out on the workbench, ready to pick up.

- **Shape:** pill (`rounded.pill`), border 1px Joist, background Bench
  Slate, text Sawdust at 0.75rem.
- **State:** on hover, border shifts to Hearth Orange and text shifts
  to Workbench Cream. No background change. No size change.
- **Layout:** `flex-wrap` with `justify-center`, so when 4 chips break
  to a 3+1 wrap, the lone chip centers under the row above instead of
  clinging to the left edge.

### Inputs

The drawers.

- **Shape:** 6px corner radius (`rounded.sm`), 1px Joist border, Bench
  Slate background, Workbench Cream text, padding 8px 12px.
- **Focus:** border shifts to Hearth Orange (the lamp catches it). No
  glow. No box-shadow. No background lift.
- **Placeholder:** Cold Pewter text, not italicised. The placeholder
  is the empty slot, not commentary about it.

### Sidebar

The studio wall.

- **Shape:** 288px wide on `md+` (full-height column), full-width
  horizontal stack on smaller screens.
- **Background:** Workshop Dusk (`#0a0a0a`), one shade darker than the
  main canvas, so the eye reads it as "set back from the workbench".
- **Border:** 1px Joist on the right edge at `md+`, on the bottom edge
  below `md`.
- **Internal rhythm:** 24px (`spacing.lg`) padding all around, 24px
  between major groups (identity, nav, footer).
- **Nav block:** separated from the identity block by a 1px Joist top
  border + `pt-4`. Reads as "find me" or "elsewhere", not as floating
  links.

### Avatar

The workshop badge.

- **Shape:** 48x48 circle.
- **Fill:** linear gradient from Hearth Orange to a deeper orange-700
  (`#c2410c`), top-left to bottom-right. Reads as the lamp itself
  flattened to a token.
- **Content:** the profile initial (one capital letter), set in Inter
  weight 900 at 1.125rem in `on-hearth` (Studio Black). Centered both
  axes. The initial IS the brand mark; there is no image upload path.

### Message Bubbles

The two voices in the conversation.

- **User bubble:** Hearth Orange background, Studio Black text, weight
  500, max-width 78%, right-aligned. Border-radius 14px (`rounded.lg`)
  with `rounded-br-sm` asymmetry (a 4px tail toward the bottom-right
  pointing at the sender).
- **Assistant bubble:** Bench Slate background, Workbench Cream text,
  1px Joist border, max-width 78%, left-aligned. Same rounded.lg with
  `rounded-bl-sm` tail toward the bottom-left.
- **Padding:** 8px 14px (`py-2 px-3.5`) on both.
- **Data attribute:** every bubble carries `data-role="user"` or
  `data-role="assistant"` so tests and automation can target them
  without depending on visual classes.

### Booking CTA

The open sign. Always reachable in one click on every authenticated
screen (top-right of the chat top bar) and on the AuthGate (as the
ghost variant). Lazy-loads the Calendly widget on first click; falls
back to a `mailto:` if the script load fails. Never a static
`<script>` tag at page load (a CSP-strict-dynamic regression we
already paid for once).

## 6. Do's and Don'ts

### Do

- **Do** keep Hearth Orange to ≤10% of any screen surface (The One
  Lamp Rule).
- **Do** use tinted neutrals: Studio Black (`#111`) over true black,
  Workbench Cream (`#f5f5f4`) over true white.
- **Do** set display and headline at `-0.03em` tracking. Tightness is
  what makes the loud type work.
- **Do** lazy-load the Calendly widget script inside `BookingCta`'s
  click handler. Static `<script>` tags get blocked by the
  `strict-dynamic` CSP and there is no graceful fallback.
- **Do** test contrast at AA mandatory, AAA where the muted hierarchy
  doesn't flatten (per PRODUCT.md).
- **Do** respect `prefers-reduced-motion` on `animate-fade-in` and
  `animate-accent-drift`. Hospitality means not making the room move
  for a visitor who asked it to be still.
- **Do** put the Booking CTA on every authenticated screen, top-right.
- **Do** mark messages with `data-role="user"` or
  `data-role="assistant"` on the outer wrapper. Tests target this
  attribute.

### Don't

- **Don't** add `box-shadow` to cards, sidebars, or inputs (The Flat
  Bench Rule). The only depth signal is the AuthGate `hero-glow` and
  the focus-visible outline.
- **Don't** ship a **generic SaaS landing**: gradient hero, three
  feature cards with icon + headline + paragraph, "Trusted by [logos]"
  band, testimonial carousel. (PRODUCT.md anti-reference.)
- **Don't** ship a **boring résumé PDF in HTML**: sans-serif body
  text, header / experience / skills / education sections, contact
  block top-right. The chat replaces the experience section by design.
  (PRODUCT.md anti-reference.)
- **Don't** chase the **crypto / web3 neon aesthetic**: neon-on-black,
  gradient mesh backgrounds, glowing buttons, aggressive futurism.
  (PRODUCT.md anti-reference.)
- **Don't** revive the **glass-morphic 2021 dashboard**: frosted blur
  cards, pastel gradients, drop-shadow stacks. (PRODUCT.md
  anti-reference.)
- **Don't** use em dashes in body copy or UI text. Use commas, colons,
  periods, or parentheses. (Project copy rule, also enforced by the
  impeccable skill.)
- **Don't** use `border-left` greater than 1px as a colored stripe
  accent on cards, list items, or callouts. Side-stripes are an
  absolute ban.
- **Don't** use `background-clip: text` with a gradient on any text.
  Gradient text is decorative, never meaningful. Emphasis is via
  weight, color, or italic, never via gradient.
- **Don't** introduce a second accent color. The workshop has one
  lamp. If a future task needs to differentiate two states, do it
  through weight, position, or tint of the existing accent, not a new
  hue.
- **Don't** add a static `<script src="...">` tag for third-party
  widgets in `<svelte:head>`. The CSP uses `strict-dynamic`; static
  script tags will always be blocked. Lazy-load on demand.
