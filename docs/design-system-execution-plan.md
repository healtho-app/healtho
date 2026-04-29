# Plan — Apply Healtho Design System (Claude Design output) to the live web app

## Context

**Why this is happening.** Claude Design has produced a complete cross-platform design system bundle for Healtho — tokens, fonts, primitives, redesigned components, redesigned pages, and a Skills manifest. The user wants to apply it to the live web app as a full redesign (tokens + primitives + every page reskinned). The app is currently deployed to production at `healtho-kohl.vercel.app`; **master must not break**. The branch + PR + Vercel-preview workflow established during the monorepo migration is the rails this work runs on.

**What the bundle contains** (verified via gunzip/tar on `webfetch-1777435543186-60e8nw.bin`):
- `project/colors_and_type.css` — full token layer as CSS vars (brand, surfaces, macros, motion, fluid type, web-vs-mobile platform variants).
- `project/fonts/` — self-hosted Lexend (10 weights) + DM Mono (6 cuts) `.ttf` files.
- `project/ui_kits/app/Primitives.jsx` — visual spec for primitives (Button, GradText, MI icon, etc.). Inline-style mockup, not production React. **Recreate visually in Tailwind/JSX, don't copy structure.** (SKILL.md is explicit on this.)
- `project/frontend/src/components/*.jsx` — redesigned versions of CalorieRing, MacroCard, MealSection, WaterTracker, Header, CelebrationOverlay, plus the landing components.
- `project/frontend/tailwind.config.js` + `project/frontend/src/index.css` — drop-in replacements / merge sources.
- `project/preview/*.html` — per-component preview pages (visual reference for QA).
- `project/ui_kits/app/*.html` — full-page mocks (dashboard, landing, register, profile).
- `README.md`, `SKILL.md`, `PLATFORMS.md` — brand DNA, content voice, non-negotiables, web vs. mobile divergence rules.

**What's already aligned in the current app.** Brand colors (`#8b5cf6`, gradient stops), Lexend + DM Mono, dark base `#030213`, 7 of the keyframes, macro color scheme, Material Symbols icons. The tailwind config is ~80% there. **The token layer is mostly an additive change, not a rewrite.** That's a meaningful de-risk.

**What's genuinely new.**
- Self-hosted fonts (vs. current Google Fonts CDN).
- CSS variable token layer (the app currently uses Tailwind theme keys + hardcoded hex).
- Semantic typography classes (`.h-display`, `.h1`, `.body`, `.label`, `.num-display`, `.text-gradient`, `.eyebrow`).
- Fluid type via `clamp()`.
- Reward keyframes (`rewardPop`, `rewardBurst`, `rewardShimmer`).
- Cross-platform `data-platform="mobile"` attribute pattern.
- Reusable primitives (Button/Card/Input/Modal/Badge) — currently zero exist in the app.
- Updated component visuals across the board.
- Updated landing-page sections.

---

## Packaging decision (recommended)

**Hybrid extraction.** Since the user picked "I don't know" — here's the call:

- **Tokens land in `packages/ui/`.** `colors_and_type.css` + `fonts/` + a thin `tokens.ts` re-export. Tokens are tiny, stable, and the natural shared-across-platforms surface — exactly what the monorepo migration was built for. Closes that loop.
- **Primitives land in `packages/ui/`** (Button, Card, Input, Modal, Badge, IconButton, MealAvatar). These are reusable across web and future React Native (with platform variants). Future-proof.
- **Updated app components stay in `apps/web/src/components/`.** CalorieRing, MacroCard, MealSection, etc. are already web-app-specific; they consume primitives + tokens but don't need to be in the UI package.
- **Page-level redesigns stay in `apps/web/src/pages/`.** Dashboard, Profile, Register, Landing.

This requires Phase 1.5 work (Vite alias, packages/ui build setup) but pays off immediately and matches the design system's own architecture.

---

## Branch + PR strategy — single long-lived feature branch

**Master stays untouched for the duration of the redesign.** A partially-applied design system (new tokens with old components, or new buttons in old layouts) looks worse than the current app — mixed state is jarring for users. We hold the entire change off main until it's coherent and QA'd, then merge once.

### Two-tier branch model

```
main  ── (untouched until final merge) ──────────────────────────────────┐
                                                                         │
feature/design-system  (long-lived) ──┬──────┬──────┬──────┬──── … ──── final PR → main
                                       │      │      │      │
                                       │      │      │      │   <- internal PRs
                                  design/01  /02   /03   /04
                                  tokens primitives dash etc.
```

- **`feature/design-system`** — cut once from `main` at Phase 0. All work lives here. **Nothing on this branch ships to production until the final merge.**
- **`design/0X-xxx` sub-branches** — short-lived, cut from `feature/design-system`, merged back into `feature/design-system` via internal PRs (NOT into main). Each sub-PR is reviewable, gets its own Vercel preview, can be rolled back without losing other work.
- **One final PR** at the end: `feature/design-system` → `main`. This is the only thing that ever lands on production. Big PR, but everything in it has already been reviewed sub-PR by sub-PR.

### Vercel preview strategy

Vercel auto-builds every push to any non-production branch as a preview deploy. So:
- **`feature/design-system` gets its own stable preview URL** (e.g. `healtho-git-feature-design-system-ayushkapoor11s-projects.vercel.app`). This is the live "what does the redesign look like right now" demo. Send this URL to anyone who wants to see progress.
- **Each `design/0X-xxx` sub-branch also gets its own preview URL** for sub-PR review.
- **Production (`healtho-kohl.vercel.app`) keeps deploying from `main` — unchanged the entire time.**

### Keeping the feature branch in sync

Long-lived branches drift. To prevent painful merge conflicts at the end:
- **Once a week, merge `main` into `feature/design-system`** (`git checkout feature/design-system && git merge main`). If main is quiet, this is a no-op. If main has commits (urgent bug fixes, etc.), they get pulled in cleanly while the work is still small.
- **Don't rebase** the feature branch — it's shared across sub-branches. Use merge commits.

### Rollback anchors

- **Tag `pre-design-system`** cut at `main` HEAD before Phase 0. This is the single-command rollback if the final merge ever needs to be undone.
- **Pre-final-merge tag**: when we're about to merge `feature/design-system` → `main`, cut a second tag `main-before-design-merge`. Belt-and-suspenders.

Rollback layers if the final merge goes bad:
- **Layer 1** — Vercel dashboard "promote" the previous production deploy. Instant.
- **Layer 2** — `git revert <merge-sha>` on main. The feature branch survives, can be fixed and re-merged.
- **Layer 3** — reset main to `pre-design-system` tag. Nuclear; only if Layers 1–2 fail.

### Why not ship phases incrementally to main?

Tempting alternative: ship Phase 1 (tokens) to main behind no visible changes, since tokens add up to a no-op visually. Then ship Phase 2 (primitives) to main since they're unused alongside. Etc.

**Rejected** because:
- Even "invisible" token changes can introduce subtle regressions (font-loading flicker, FOUT, paint differences) that hit real users.
- The user explicitly wants production unchanged until the redesign is coherent.
- Long-lived feature branch is a known, documented monorepo pattern. Painful only if neglected; we have the discipline (weekly main merges) to prevent that.

---

## Phased execution

### Phase 0 — Set up & extract (no code change, ~30 min)

- Decompress the bundle to a working location **outside the repo** (e.g. `~/Documents/healtho-design-system/`) so we read it as reference. Do not check it into the repo wholesale.
- Cut tag `pre-design-system` on current `main`. Push the tag.
- Create the long-lived branch: `git checkout main && git pull && git checkout -b feature/design-system && git push -u origin feature/design-system`.
- Cut the first sub-branch off it: `git checkout -b design/01-tokens`.
- Verify Vercel auto-deploys both branches as previews (Settings → Git → Ignored Build Step should not exclude these).
- Note the stable preview URL for `feature/design-system` — bookmark it; this is the "live progress" demo.

### Phase 1 — Foundation: tokens + fonts + semantic classes (~half day)

**Goal:** every existing page renders identically in production after this PR. The token layer is added, fonts are self-hosted, semantic classes are available. **Zero visual regressions** is the success criterion — pages should look the same because the tokens already match.

Files created:
- `packages/ui/tokens.css` — copy of `project/colors_and_type.css` (verbatim).
- `packages/ui/fonts/*.ttf` — Lexend + DM Mono.
- `packages/ui/index.css` — re-exports tokens.css and registers `@font-face` paths relative to package.
- `packages/ui/package.json` — add `"main": "./tokens.css"`, `"./tokens.css"` export, `"./fonts/*"` export.
- `packages/ui/tokens.ts` — TypeScript const re-export (for future RN consumption). Optional Phase 1.5; can defer.

Files modified:
- `apps/web/package.json` — add `"@healtho/ui": "workspace:*"`.
- `apps/web/vite.config.js` — add `resolve.alias` for `@healtho/ui` (Vite handles workspace deps natively if pnpm linked, but alias gives us flexibility).
- `apps/web/src/index.css` — `@import '@healtho/ui/tokens.css'` at top; merge any custom keyframes that aren't already in tokens.css; add reward keyframes (`rewardPop`, `rewardBurst`, `rewardShimmer`); add semantic typography classes (`.h-display`, `.h1`–`.h3`, `.body`, `.body-sm`, `.label`, `.label-xs`, `.eyebrow`, `.num`, `.num-display`, `.text-gradient`).
- `apps/web/tailwind.config.js` — diff against `project/frontend/tailwind.config.js`, merge any missing token references. Most should already match.
- `apps/web/index.html` — remove Google Fonts `<link>` for Lexend + DM Mono (keep Material Symbols CDN for now). Add `<html lang="en" class="dark">` if not present.
- `pnpm-workspace.yaml` — confirm `packages/*` covered (already is).

Verification:
- `pnpm install` resolves `@healtho/ui` workspace dep without warnings.
- `pnpm --filter healtho-web dev` starts cleanly.
- Browser DevTools → Network: fonts load from `/assets/fonts/...` (Vite-bundled), not Google Fonts CDN.
- Existing Dashboard, Landing, Register render identically against `pre-design-system` tag (visual diff via screenshots or eyeballing).
- Vercel preview: pull URL, click through 5 key screens, confirm no broken layouts.

Ship as **internal PR** `design/01-tokens` → `feature/design-system`. Merge once green. **Does NOT touch main.**

### Phase 2 — Primitives package (~1 day)

**Goal:** add reusable Button/Card/Input/Modal/Badge/IconButton/MealAvatar primitives to `packages/ui`. **No existing component is replaced yet.** Primitives sit alongside.

Files created in `packages/ui/components/`:
- `Button.jsx` — variants: `primary` (gradient + shadow + rounded-full), `secondary` (slate-900 surface), `ghost`. Sizes `sm/md/lg`. Reads `--btn-h-*` and `--touch-min` from tokens. Built in proper Tailwind, not inline styles. Read `Primitives.jsx` for visual spec.
- `Card.jsx` — slate-900 surface, hairline border, optional glow blob slot. Variants `default`, `elevated`.
- `Input.jsx` — slate-900 surface, hairline border, focus ring (`var(--tap-ring)`), optional leading icon.
- `Modal.jsx` (web) — backdrop blur, centered, max-width, ESC handler. (Mobile bottom-sheet variant deferred to Phase 4 if at all — we're shipping web first.)
- `Badge.jsx`, `IconButton.jsx`, `MealAvatar.jsx`, `MaterialIcon.jsx` (the `MI` from Primitives.jsx).
- `index.ts` — barrel export.

Files modified:
- `packages/ui/package.json` — add component exports.

Verification:
- Build a Storybook-style preview page at `apps/web/src/pages/_design-preview.jsx` (gitignored or behind a flag — not shipped). Render every primitive in every variant. Compare side-by-side to `project/preview/comp-*.html` files.
- All primitives import cleanly: `import { Button, Card } from '@healtho/ui'`.
- TypeScript not strictly required Phase 2 since the app is JS — primitives can ship as `.jsx`. Add `.d.ts` stubs only if friction shows up.

Ship as **internal PR** `design/02-primitives` → `feature/design-system`. Merge once green. **Does NOT touch main.**

**Sync gate — at end of Phase 2:** `git checkout feature/design-system && git merge main` to pull any production hotfixes that landed during Phases 1–2. Resolve conflicts immediately while the surface area is still small.

### Phase 3 — Reskin in-app components (~2 days, multiple PRs)

**Goal:** update each existing component to use new primitives + new visual spec. One PR per logical group. **Every sub-PR targets `feature/design-system`, never main.**

Order (lowest blast radius first):
- Sub-PR 3a: `MacroCard`, `WaterTracker`, `CalorieRing`, `MealSection` — diff against `project/frontend/src/components/*.jsx`. These are read-only display primitives; safest to swap.
- Sub-PR 3b: `Header` — touches every page; do it once, verify everywhere.
- Sub-PR 3c: `CelebrationOverlay` — wire the new reward keyframes; verify confetti still fires.

Per sub-PR:
- Compare current component vs. design-system version.
- Apply visual changes; preserve behavior (props, data flow, callbacks).
- Test on the sub-branch's Vercel preview against the matching `project/preview/comp-*.html` page.

**Sync gate — at end of Phase 3:** weekly `main → feature/design-system` merge if not already done.

### Phase 4 — Reskin in-app pages (~3–4 days, multiple PRs)

**Goal:** redesign Dashboard, Register, Login, Profile, LogFoodModal page-by-page. **Every sub-PR targets `feature/design-system`, never main.**

Order:
- Sub-PR 4a: **Dashboard** (`apps/web/src/pages/Dashboard.jsx`) — the highest-traffic screen. Match `project/ui_kits/app/Dashboard.jsx` visually. Manual mobile QA.
- Sub-PR 4b: **Login + Register entry** — match `project/ui_kits/app/AuthScreens.jsx`. Don't refactor Register's 1,578-line monolith yet — reskin in place. Refactoring is a separate ticket (already in HLTH backlog).
- Sub-PR 4c: **Profile** — apply primitives, update copy to match voice rubric.
- Sub-PR 4d: **LogFoodModal** — biggest risk surface (1,019 lines). Reskin in place; flag a follow-up ticket to break it up.

**Risk callout for the user:** Register.jsx (1,578 lines) and LogFoodModal.jsx (1,019 lines) are both monolithic. Reskinning in place is faster but harder to review and easier to introduce regressions. Per-step refactor is a 1-week tax we may want to absorb after the design system lands. Do not try to do both at once.

**Sync gate — at end of Phase 4:** weekly `main → feature/design-system` merge.

### Phase 5 — Reskin landing page (~1 day)

**Goal:** match `project/ui_kits/app/Healtho Landing Page.html` and the per-section JSX in `project/frontend/src/components/landing/`.

Files modified: `HeroSection.jsx`, `FeaturesSection.jsx`, `BenefitsSection.jsx`, `PricingSection.jsx`, `Footer.jsx`, `LandingNavbar.jsx`, `BackgroundMedia.jsx`, `DashboardPreview.jsx`, `StatsBar.jsx`.

Assets check: `hero-poster.jpg`, `features-bg.jpg`, `benefits-poster.jpg` already exist in `apps/web/public/`. Hero/benefits videos are missing; design system says fall back to posters — confirmed acceptable.

Ship as **internal PR** `design/05-landing` → `feature/design-system`. Merge once green. **Does NOT touch main.**

### Phase 6 — Polish & validation (~half day)

- `prefers-reduced-motion` audit: confirm reward animations collapse to final state in macOS System Preferences with reduce-motion on.
- Lighthouse run: confirm font self-hosting hasn't regressed performance score.
- Mobile QA on real iPhone + Android. The 520px max-width container will need the design system's mobile spec applied (320–390px frame, 16px gutter).
- Remove dead code from `apps/web/src/index.css` (animations now in tokens.css).
- Update memory file with execution log + any deltas.

Ship as **internal PR** `design/06-polish` → `feature/design-system`. Merge once green. **Does NOT touch main.**

---

### Phase 7 — Final merge to main (~half day, single big event)

This is the only step in this entire project that touches production.

Pre-flight:
- Final QA pass on the `feature/design-system` Vercel preview URL — every screen, mobile + desktop.
- Resolve any open sub-PR comments.
- Final `git merge main → feature/design-system` to absorb any last main-branch hotfixes.
- Cut tag `main-before-design-merge` at current `main` HEAD.

The merge:
- Open ONE PR: `feature/design-system` → `main`. Title: "Apply Healtho Design System (full redesign)". Body: link to plan, list of phases, Vercel preview URL, rollback instructions.
- Squash-merge or merge-commit (preference: merge-commit, preserves the per-phase commit history for forensics).
- Vercel auto-deploys main to production.
- Run the production smoke test (5 screens, end-to-end food log, sign in/out).

Post-merge:
- If anything fails: Layer 1 rollback (Vercel promote previous prod deploy), file a hotfix branch off main, re-merge.
- If all green: delete `feature/design-system` locally and on origin (it's served its purpose).
- Update memory + execution log on main.

---

## Critical files to modify (cumulative across phases)

| Phase | File | Action |
|---|---|---|
| 1 | `packages/ui/tokens.css` | Create (copy of design system) |
| 1 | `packages/ui/fonts/*.ttf` | Create (copy of design system) |
| 1 | `packages/ui/package.json` | Add font + CSS exports |
| 1 | `apps/web/package.json` | Add `@healtho/ui` workspace dep |
| 1 | `apps/web/vite.config.js` | Add alias for `@healtho/ui` |
| 1 | `apps/web/src/index.css` | Import tokens, add semantic classes, add reward keyframes |
| 1 | `apps/web/tailwind.config.js` | Merge any missing tokens from design system version |
| 1 | `apps/web/index.html` | Remove Google Fonts CDN for Lexend + DM Mono |
| 2 | `packages/ui/components/{Button,Card,Input,Modal,Badge,IconButton,MealAvatar,MaterialIcon}.jsx` | Create primitives |
| 2 | `packages/ui/index.ts` | Barrel export primitives |
| 3 | `apps/web/src/components/{CalorieRing,MacroCard,MealSection,WaterTracker,Header,CelebrationOverlay}.jsx` | Reskin |
| 4 | `apps/web/src/pages/{Dashboard,Login,Register,Profile}.jsx` | Reskin |
| 4 | `apps/web/src/components/LogFoodModal.jsx` | Reskin (in place; refactor deferred) |
| 5 | `apps/web/src/components/landing/*.jsx` | Reskin |

---

## Existing utilities to reuse (don't duplicate)

- `lib/macroTargets.js` — already does the 50/25/25 split. Used by Dashboard + Register. Don't recompute.
- `ProfileContext` — already exposes `{ profile, loading, refreshProfile }`. New components consume it, don't reimplement.
- `canvas-confetti` — already in deps; the new CelebrationOverlay uses it, no new package needed.
- `@dicebear/*` — avatar fallback already wired.
- Tailwind theme tokens — most brand colors already mapped; we layer CSS vars on top via `var(--brand-primary)` references in `theme.extend.colors`.

## Things NOT in scope of this plan (flag for separate work)

- Refactoring `Register.jsx` (1,578 lines) into per-step components.
- Refactoring `LogFoodModal.jsx` (1,019 lines).
- Fixing the LogFoodModal edit-as-INSERT data corruption bug (separate ticket — `B1` in Sprint 3 brief).
- Adding the onboarding gate to ProtectedRoute (separate ticket — `B2`).
- `weight_logs` table + UI (separate ticket — `F1`).
- Light mode (design system explicitly defers it).
- React Native consumption of `packages/ui` (Phase 4 product roadmap, not now).

---

## Security validation gates (non-negotiable)

Approved on the explicit condition that industry-standard security practices are upheld throughout. Every sub-PR must pass these checks before merging into `feature/design-system`. The final PR into `main` requires all of them re-run plus the pre-merge sweep at the bottom.

### Per sub-PR (every merge into `feature/design-system`)

1. **Dependency audit.** `pnpm audit --audit-level=high` returns zero high/critical CVEs. If any appear, stop and resolve before merging.
2. **No new npm dependencies without justification.** This migration *should* add zero deps — tokens are CSS, primitives are React + Tailwind already shipped. Any new entry in `package.json` must be called out in the sub-PR body with reasoning.
3. **Secret scan on the diff.** Before `git push`, run a sanity grep across staged changes: `git diff --cached -U0 | grep -iE '(secret|api[_-]?key|password|token=|bearer )'`. Anything that hits is a blocker — no credentials in committed files, ever.
4. **No XSS sinks when porting Primitives.jsx.** The design system's `Primitives.jsx` is an inline-style mockup. When recreating it as production JSX:
   - No `dangerouslySetInnerHTML`.
   - No `eval`, `new Function`, or dynamic script injection.
   - No inline `onclick="..."` / `onload="..."` strings — wire React event handlers properly.
   - Material Symbols rendered as text content inside `<span>`, never as innerHTML from a variable.
5. **Same-origin assets only.** Fonts must load from `/assets/fonts/...` (Vite-bundled), never a third-party CDN. Verify in DevTools → Network on the preview deploy.
6. **Lockfile integrity.** `pnpm-lock.yaml` is committed alongside any `package.json` change. Never `--no-frozen-lockfile` on CI.

### Don't touch (without explicit reasoning in PR body)

- `vercel.json` security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). The redesign is visual; headers stay put.
- Supabase RLS policies, auth flows, session handling, or any `supabase.auth.*` call sites. Login/Register reskins (Phase 4b) are visual-only — existing form submit handlers are preserved verbatim, no behavior changes.
- `.env`, `.env.example`, or any environment variable plumbing.
- Service worker registration (if/when added).

### Supply-chain hygiene for the design bundle

- When the TTF fonts land in `packages/ui/fonts/` (Phase 1), log SHA-256 of each file in the execution log. This becomes the integrity baseline — if any TTF ever changes in a later commit without a stated reason, that's a red flag.
- The design bundle came from `https://api.anthropic.com/v1/design/...` — trusted source, but the principle applies regardless: vendored assets get checksummed at the door.
- Don't re-fetch the bundle mid-migration. Decompress once at Phase 0, work from the local copy.

### Pre-Phase-7 sweep (before final PR into `main`)

In addition to all per-sub-PR checks rerun on the merged feature branch:

7. **Lighthouse run on the `feature/design-system` preview URL.** Confirm:
   - No CSP violations in the report.
   - No mixed-content warnings.
   - Performance score hasn't regressed by more than 5 points vs. current production baseline.
8. **Console clean on all 5 smoke-test screens.** No errors, no warnings about deprecated APIs, no font-loading failures, no 404s in the Network tab.
9. **`pnpm audit` final pass** — zero high/critical CVEs across the full dependency tree (including any transitive deps introduced).
10. **Manual review of the cumulative diff** (`git diff main...feature/design-system`) by both developers (Ayush + Ishaan) before opening the final PR.

Any failure at any gate = the sub-PR or final PR does not merge until resolved. Each gate's pass/fail gets logged in `docs/design-system-execution-plan.md` per phase. Security gates are not skippable for velocity.

---

## Verification — how to confirm each PR is safe to merge

1. **Vercel preview deploy succeeds** (build green).
2. **Five-screen smoke test on the preview URL:**
   - Landing page loads, hero renders, no font fallback flicker.
   - Login → Dashboard works end-to-end.
   - Add a food log via LogFoodModal — confirm it persists and renders.
   - Edit profile, save, refresh — data persists.
   - Trigger celebration (hit calorie goal in test data) — confetti + reward animation fire.
3. **Visual diff against design system preview HTMLs** for the components/pages touched. Open `project/preview/<comp>.html` in a browser side-by-side.
4. **Mobile check** at 390px viewport in DevTools (Phase 4+). Real-device test in Phase 6.
5. **`prefers-reduced-motion` check** in Phase 6: macOS System Preferences → Accessibility → Display → Reduce Motion. Reload Dashboard, trigger reward, confirm animation collapses to final state.
6. **Production smoke test after merge:** load `healtho-kohl.vercel.app`, log in with test account, log a food, sign out. Same five steps as the preview.

If any step fails post-merge: Layer 1 rollback (Vercel promote previous deploy) → fix on a new branch → re-merge.

---

## First concrete actions when execution starts

1. Open a terminal at `C:\Users\ayush\Documents\healtho`.
2. `git checkout main && git pull && git tag pre-design-system && git push origin pre-design-system` — rollback anchor.
3. `git checkout -b feature/design-system && git push -u origin feature/design-system` — long-lived branch.
4. `git checkout -b design/01-tokens` — first sub-branch off the feature branch.
5. Decompress the design bundle to `~/Documents/healtho-design-system/` (outside the repo).
6. Begin Phase 1 by copying `colors_and_type.css` → `packages/ui/tokens.css` and the `fonts/` directory → `packages/ui/fonts/`.
7. Continue Phase 1 file-by-file per the table above.
8. Push the sub-branch, open **internal PR** `design/01-tokens` → `feature/design-system`, capture the sub-branch's Vercel preview URL, run the 5-screen smoke test.
9. Merge into `feature/design-system` once green. **Do NOT merge into main.**
10. Cut next sub-branch: `git checkout feature/design-system && git pull && git checkout -b design/02-primitives`.

Total estimated effort: **6–8 working days** of sub-PR work + half-day final merge. ~9–11 sub-PRs into `feature/design-system` + 1 final PR into `main`. Production stays unchanged for the entire 6–8 working days.

---

## Memory persistence (so future sessions remember)

Long-lived feature branches span weeks. If a chat session ends mid-execution, future sessions need to know what's going on. Three layers:

1. **In-repo execution log.** Just like the monorepo migration plan got an execution log appended after it shipped, this plan gets continuously updated. Path: copy this plan into `docs/design-system-execution-plan.md` once execution starts so it lives in the repo, gets versioned with the work, and any future agent can find it. Update the log at the end of each phase with: SHA of the merge into feature branch, Vercel preview URL, deltas vs. plan, surprises.

2. **Memory file update** (post-approval, can't do in plan mode). Add an entry to `MEMORY.md` under the Healtho App section pointing to the in-repo plan and noting current phase + branch state. Update at the start of each phase. Format:
   ```
   **Design system migration** → `feature/design-system` branch. Plan: `docs/design-system-execution-plan.md`. Phase X of 7. Rollback anchor: tag `pre-design-system`. Production unchanged until Phase 7.
   ```

3. **Branch is its own breadcrumb.** `git log feature/design-system` and the in-repo plan together fully reconstruct state. As long as the branch isn't deleted, the work is recoverable even with no chat memory.

**Tag-based safety:** the `pre-design-system` tag is permanent. No matter how lost a future session gets, `git reset --hard pre-design-system` on main restores the pre-redesign world.

---

## Execution Log

Per-phase record. Each entry captures: merge SHA into `feature/design-system`, Vercel preview URL, security-gate pass/fail, deltas vs. plan, surprises. Updated at the end of every phase.

### Phase 0 — Set up & extract

- **Date started:** 2026-04-29
- **Rollback anchor tag:** `pre-design-system` cut at `b9f1ed6eb4a66d16f9e7e29105c8e5c60cbc2a9e` (main HEAD after fast-forwarding Ishaan's content-brief commit `b9f1ed6 🤖 Weekly content brief — 2026-04-27`). Pushed to origin.
- **Long-lived branch:** `feature/design-system` cut from `main@b9f1ed6`, pushed to origin.
- **First sub-branch:** `design/01-tokens` cut from `feature/design-system@b9f1ed6`, pushed to origin.
- **Design bundle location:** `C:\Users\ayush\Downloads\Healtho Design System-handoff\healtho-design-system\` (already decompressed from a prior session — re-fetch skipped per Phase 0 instructions). Verified structure: `project/colors_and_type.css`, `project/fonts/`, `project/frontend/`, `project/preview/`, `project/ui_kits/`, `README.md`, `SKILL.md`, `PLATFORMS.md` all present.
- **Plan copied to repo:** `docs/design-system-execution-plan.md` (this file). Versioned alongside the work.
- **Vercel preview verification:** _to confirm — auto-deploy expected on both new branches; capture stable preview URL for `feature/design-system` once the first build completes._
- **Security gates:** N/A for Phase 0 (no code changes, no dependency changes). pnpm audit + secret scan baseline will run at the end of Phase 1.
- **Deltas vs. plan:**
  - Repo has no `CLAUDE.md` (the user's prompt referenced one); existing conventions are documented in `README.md` instead. Followed README.
  - Bundle reused from `~/Downloads/...` rather than copied to `~/Documents/healtho-design-system/`. Saves a duplication; path is stable for the duration of the migration.
  - Pulled 1 new commit from `origin/main` before tagging (Ishaan's automation content brief landed earlier today). Tag therefore sits at `b9f1ed6`, not `941a231` from the repo snapshot at session start.
- **Surprises:** none.
- **Merge SHA into feature branch:** N/A (Phase 0 commits land on `design/01-tokens` and roll into the feature branch via the Phase 1 sub-PR).
