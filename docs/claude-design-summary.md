# Claude Design — Healtho Design System Summary

**Status:** Context snapshot, not an extraction target
**Date captured:** 2026-04-24
**Source of truth today:** `frontend/tailwind.config.js` + `frontend/index.html`
**Live Claude Design URL:** https://claude.ai/design/p/eb013398-f3ff-41ad-b3a1-20c252883110?setup=design-system
**Capture method:** Derived from checked-in config + personal-preferences brand direction. The live Claude Design project is an in-progress iterative artifact; a full PDF export will land at `docs/claude-design-output.pdf` once Ayush's Claude Design usage limit resets.

---

## Why this file exists

The monorepo migration's scope is **structural only**. It does NOT extract design tokens into `packages/shared` or `packages/ui`. This file captures the design direction today so that Prep 3 (future design-token extraction) has a written baseline to work from — and so the migration's folder layout (`packages/ui`, `packages/shared`) doesn't conflict with what Claude Design is producing.

---

## Brand direction

**Psychological model (Ayush, 2026-04):**
- **Duolingo** — reward psychology, celebration moments on goal completion, streaks, confetti, subtle haptic-equivalent feedback
- **Hinge** — warmth, human voice in microcopy, anti-clinical tone (this is a health app, not a medical device)
- **Robinhood** — dark-mode polish, glossy surfaces, restraint in color use outside of key moments

**Target user:** Adults ages 20s–60s stuck in the "I'll start tomorrow" loop around nutrition/fitness. The app needs to feel easy enough for someone who has bounced off MyFitnessPal, rewarding enough to keep them coming back past day 3.

**Live examples of the direction already in code:**
- Water goal + meal goal celebrations — confetti overlay + glowing card when thresholds hit (commit `741c912`, `useCelebration` hook + `CelebrationOverlay` component)
- Step 7 onboarding summary screen — shows BMR/TDEE/goal/macros as a "personalised plan reveal" before landing on Dashboard
- Macro cards — consumed/goal format with red over-warning (carbs/fat), no warning (protein/fiber)

---

## Color palette (authoritative, from `tailwind.config.js`)

### Brand
| Token | Hex | Role |
|---|---|---|
| `primary` | `#8b5cf6` | **Pulse Purple** — primary brand color, CTAs, active states |
| `primary-dark` | `#7c3aed` | Hover/pressed state for primary |
| `brand-pink` | `#e879f9` | Gradient start |
| `brand-cyan` | `#22d3ee` | Gradient end |
| Brand gradient | `linear-gradient(135deg, #e879f9 0%, #8b5cf6 50%, #22d3ee 100%)` | Hero backgrounds, accent moments |

### Surfaces (dark-mode first, `darkMode: 'class'`)
| Token | Hex | Role |
|---|---|---|
| `background-dark` | `#030213` | Deep navy-black app background |
| `surface` | `#0e0b1e` | Dark card surface |
| `surface-2` | `#1a1640` | Slightly elevated surface |

### Nutrition macros (domain-specific)
| Token | Hex | Role |
|---|---|---|
| `protein` | `#5b8def` | Blue — protein macro bars/cards |
| `carbs` | `#e8b84b` | Amber — carbs macro bars/cards |
| `fat` | `#e07b5b` | Terracotta — fat macro bars/cards |
| `fiber` | `#4caf7d` | Green — fiber macro (no goal today) |
| `water` | `#60b8d4` | Cyan-blue — water tracker |

---

## Typography

**Loaded from Google Fonts via `<link>` tags in `frontend/index.html`:**
- **Lexend** — weights 300/400/500/600/700/800/900. Mapped to Tailwind `font-display` and used for headings + interface text generally.
- **DM Mono** — weights 400/500. Mapped to Tailwind `font-mono` and used for numeric readouts (calorie counts, macro grams, BMI, weight).
- **Material Symbols Outlined** — variable font for iconography, loaded with `wght,FILL@100..700,0..1` axes enabled.

**Implication:** External URLs — not affected by the monorepo restructure. Plan risk R7 ✓.

**CSP allows:** `https://fonts.googleapis.com`, `https://fonts.gstatic.com` in `style-src` and `font-src` respectively (from `frontend/vercel.json`).

---

## Radius scale

From `tailwind.config.js`:
- Default: `0.25rem`
- `lg`: `0.5rem`
- `xl`: `0.75rem`
- `2xl`: `1rem`
- `full`: `9999px`

---

## Motion principles (inferred, not codified)

The live codebase uses CSS keyframes (see `frontend/src/index.css`) for the celebration overlay glow + confetti pulse. There is no Framer Motion or GSAP dependency in `frontend/package.json` — all motion today is CSS-driven. No documented principles yet; Claude Design may produce these.

**For Prep 3:** If Claude Design ships motion specs (easing curves, duration tokens), they belong in `packages/shared` as design tokens alongside colors/spacing.

---

## Component inventory (what exists today in `frontend/src/`)

**Page-level:**
- `Landing` (hero video, stats bar, benefits, features, pricing, footer — see `components/landing/*`)
- `Register` (multi-step onboarding, steps 1–7)
- `Login`
- `ForgotPassword` / `ResetPassword` / `AuthCallback`
- `Dashboard` (calorie ring, macro cards, water tracker, meal sections)
- `Profile`
- `Privacy` / `Terms` / `NotFound`

**Shared components:**
- `Header` (avatar + nav)
- `CalorieRing` (SVG ring with goal + consumed)
- `MacroCard` (consumed/goal with overflow warning)
- `WaterTracker` (8-dot grid, reset, goal celebration)
- `MealSection` (breakfast/lunch/dinner/snacks collapsible)
- `LogFoodModal` (USDA + local foods search)
- `ProtectedRoute` (auth gate)
- `ProfileLoadError` (fallback UI)
- `CelebrationOverlay` (confetti + glow wrapper)

**Landing-specific:**
- `HeroSection`, `LandingNavbar`, `BenefitsSection`, `FeaturesSection`, `PricingSection`, `StatsBar`, `DashboardPreview`, `BackgroundMedia`, `Footer`

---

## Implications for Prep 3 (future design-token extraction)

When Claude Design finalizes and the PDF exports:

1. **Tokens extracted to `packages/shared`:**
   - `colors.ts` — the 14 named brand/surface/macro colors above
   - `typography.ts` — font families + weight mappings + size scale (once Claude Design codifies sizes; today they're implicit Tailwind defaults)
   - `radius.ts` — 5 radius tokens
   - `motion.ts` — easing + duration tokens (once defined)

2. **Tailwind config rewrite:**
   - `frontend/tailwind.config.js` (post-migration path: `apps/web/tailwind.config.js`) imports tokens from `@healtho/shared` instead of hardcoding hex values.
   - Same pattern for the future React Native app — both consume from `packages/shared`.

3. **Shared component contracts in `packages/ui`:**
   - Primitives that are platform-agnostic (logic only, no JSX) belong in `packages/shared` — e.g. `computeMacroTargets` already at `lib/macroTargets.js` is a natural Prep 2 move.
   - Actually-rendered web + RN variants sit in `packages/ui/web/*` and `packages/ui/native/*`.

4. **Nothing to do in this migration.** `packages/shared` and `packages/ui` are created empty. Prep 2+ will populate them. This document is the starting input for Prep 3's planning doc.

---

## Open questions for Claude Design (track for Prep 3)

- Does Claude Design produce a spacing scale distinct from Tailwind defaults?
- Are there component-specific color tokens (e.g., `cta-background` vs. `primary`) we should codify separately?
- Is there a light-mode variant, or is the app dark-mode-only?
- What are the motion specs — easing + duration — for page transitions, modal open/close, celebration reveals?
- Accessibility: are contrast ratios on `surface` + `surface-2` against `background-dark` documented?

---

*This document is the pre-Prep-3 baseline. It will be superseded by the Claude Design PDF export (`docs/claude-design-output.pdf`) once Ayush's usage limit resets.*
