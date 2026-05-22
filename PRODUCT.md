# Product

## Register

brand

> The site has two surfaces — a brand-shaped landing/AuthGate and a
> product-shaped authenticated chat. The default register is **brand**
> because the landing carries the primary user (hiring managers and
> recruiters) and does the persuasion before sign-up. Per-task overrides
> apply when working purely on the chat interior.

## Users

**Primary**: hiring managers and technical recruiters evaluating fit.
They land here cold (often from a LinkedIn link, an outbound email, or a
candidate's signature), need to decide within seconds whether to keep
reading, and within a minute whether to book a conversation. Context is
busy: skimmed on a desktop tab between other candidates, possibly with
half-formed opinions about AWS / cloud architecture as a discipline.

**Secondary**: peer engineers and potential collaborators arriving via
word-of-mouth or shared links. They're already half-sold by the time they
arrive; what they want is depth (architecture decisions, specific
projects, how the person thinks).

The job to be done, in both cases, is **"can I trust this person to
solve my problem?"** — answered through evidence, not adjectives.

## Product Purpose

A working CV that demonstrates cloud-engineering capability instead of
listing it. The AI chat, grounded in real project history, answers
specific questions ("show me a recent serverless project", "are you open
to remote roles") in the visitor's own framing. The Calendly booking CTA
is always one click away so an interested visitor can convert before
their attention budget runs out.

Success on a visit takes two forms, weighted equally:

- **Hard**: a booked 15-minute call.
- **Soft**: a bookmarked or forwarded URL — word-of-mouth is the channel
  that compounds.

## Brand Personality

**Confident. Warm. Modern.**

- *Confident*: makes claims plainly and lets the work back them. No
  hedge-words ("might", "perhaps", "open to discussing"), no quiet
  apology in the copy. The booking CTA reads "Book 15 min", not "Get in
  touch maybe".
- *Warm*: a person, not a product page. First-person voice in the chat
  intro ("I'm Mariano, AWS Solutions Architect"). Hospitality in the
  microcopy ("Step inside to chat with my AI assistant"). The warm-orange
  accent over the dark canvas literally embodies this: warm light
  against a neutral room.
- *Modern*: contemporary craft without trend-chasing. Tight typography,
  generous spacing, restrained palette, intentional motion. Not
  "futuristic", not "minimalist as a brand" — modern as in "current
  practice, well executed".

## Anti-references

What this site is explicitly **not**:

1. **Generic SaaS landing** — gradient hero, three icon/headline/text
   feature cards, testimonial carousel, "Trusted by [logos]", end-of-page
   CTA. The personal CV is not a product; the SaaS template signals
   "tool for sale" and misrepresents the offering.
2. **Boring résumé PDF in HTML** — sans-serif body text in a single
   column, header / experience / skills / education sections, contact
   block top-right. Conveys "compliance with a template" rather than
   "considered design decisions". The chat replaces the experience
   section by design.
3. **Crypto / web3 neon aesthetic** — neon-on-black, gradient mesh
   backgrounds, glowing buttons, aggressive futurism. Reads as immature
   and trend-following; the opposite of the warm-confident register.
4. **Glass-morphic 2021 dashboard** — frosted blur cards, light pastel
   gradients, drop-shadow stacks. Already dated; would signal "designed
   in 2021 and never updated" to a 2026 visitor.

## Design Principles

1. **Show, don't tell.** The chat IS the demonstration of capability —
   let visitors discover it instead of reading bullet-pointed claims.
   Bullet lists of skills are a tell that the work doesn't speak for
   itself. The voice never says "I'm experienced with X"; the chat
   answers about X when asked.
2. **Restraint signals seniority.** Fewer moving parts, fewer claims,
   fewer accents. A senior engineer's portfolio looks calm because they
   have nothing to prove with visual noise. If something can be dropped
   without losing meaning, it should be dropped.
3. **Two surfaces, one impression.** Brand landing and product chat
   must feel like the same person spoke them. Type system, spacing,
   accent role, motion energy — all consistent across the AuthGate
   boundary. A visitor crossing from landing to chat shouldn't feel a
   register flip.
4. **The booking CTA is the through-line, but never the loudest thing.**
   It's present on AuthGate (ghost-pill, secondary) and on every
   authenticated screen (solid-pill, top-right). Reachable in one click
   without being the page's emotional center.
5. **Friction with intent, no friction without.** The email-gate before
   chat is deliberate — it's a low-effort declaration of interest, and
   it makes the visitor registry useful. Everything else should be
   frictionless: instant chat response, no modals, no "are you sure",
   no welcome tour. Earn the visitor's next 60 seconds with what they
   came for.

## Accessibility & Inclusion

**WCAG 2.2 AA mandatory, AAA where it doesn't compromise the design.**

- Body-text contrast: AA (4.5:1) mandatory; AAA (7:1) where reachable
  without flattening the dark / muted hierarchy. The current
  `text-fg-muted` / `text-fg-subtle` tokens should be audited against
  these floors.
- All interactive elements: full keyboard navigation, visible
  `focus-visible` ring (the design tokens already include an `outline`
  on focus), no keyboard traps.
- `prefers-reduced-motion`: the existing animations (`animate-fade-in`,
  `animate-accent-drift`, suggestion-chip hover) must respect the user
  preference. If not already gated, they should be.
- Color is never the only signal — the warm-orange accent always carries
  redundant signal (label text, position, weight).
- Form errors (sign-in failure, daily-cap reached) speak in plain
  language, addressed to the user, not the developer.

Known specific accommodations: this is a single-author personal site, so
no formal certification target. The bar is "would I be embarrassed if a
visitor with a screen reader had a worse experience than a visitor
without one?" — and the answer should be no.
