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
- **Vercel preview verification:**
  - `design/01-tokens` — auto-deployed at SHA `30b9b98` to `https://healtho-git-design-01-tokens-ayushkapoor11s-projects.vercel.app/` (deploy `dpl_3rFYSkDiTcSBauhqPHG9pCfFsNgo`, state READY). Confirms no Ignored Build Step is excluding sub-branches.
  - `feature/design-system` — pushed at SHA `b9f1ed6` (identical to current main HEAD). Vercel did **not** trigger a fresh build for the feature branch because the SHA matches the existing production main build. The stable branch-alias URL will be `https://healtho-git-feature-design-system-ayushkapoor11s-projects.vercel.app/` and will resolve once the first sub-PR merge lands a unique commit on the branch (expected end of Phase 1). No project-side exclusion to fix.
  - Project settings inspected (`prj_z8cD0H7nDvfQs3mn0ueRdjmmNtCe`): no Ignored Build Step. `framework: vite`. **Discrepancy flagged for later:** Vercel project `nodeVersion: 24.x` while the repo's `.nvmrc` pins Node 20. Tracked as a follow-up — does not block Phase 0; will be reconciled before final merge.
- **Security gates:** Phase 0 has no dependency changes, so `pnpm audit` was deferred to Phase 1. **Secret scan ran** on the staged diff before push:
  - `git diff --cached -U0 | grep -iE '(secret|api[_-]?key|password|token=|bearer )'` returned 2 hits, **both meta-references** (the plan text describing the secret-scan policy itself). No actual credentials in the diff. Manually verified, push approved.
  - Future-phase note: this scan command will produce the same false positives whenever the plan doc is touched. Consider adding `| grep -v 'docs/design-system-execution-plan.md'` or scanning only `.js,.jsx,.ts,.tsx,.css,.json,.html,.env*` files. Tracked as a Phase 1 hygiene item.
- **Deltas vs. plan:**
  - Repo has no `CLAUDE.md` (the user's prompt referenced one); existing conventions are documented in `README.md` instead. Followed README.
  - Bundle reused in place at `C:\Users\ayush\Downloads\Healtho Design System-handoff\healtho-design-system\` rather than copied to `~/Documents/healtho-design-system/`. Skips a duplication; path is stable for the duration of the migration.
  - Pulled 1 new commit from `origin/main` before tagging (Ishaan's automation content brief `b9f1ed6 🤖 Weekly content brief — 2026-04-27`). Tag therefore sits at `b9f1ed6`, not `941a231` from the repo snapshot at session start.
  - `design/01-tokens` was pushed to origin in Phase 0 (the user's step 4 listed only `git checkout -b`, but step 7 required Vercel preview verification on "both new branches" — push was the obvious enabler). The bootstrap commit (this plan doc) lives on `design/01-tokens`; it will roll into `feature/design-system` via the Phase 1 sub-PR.
- **Surprises:**
  - The secret-scan grep is self-tripping on the plan doc itself. False positive, but the gate as written will flag the same lines on every doc edit. Fix in Phase 1.
  - Vercel `nodeVersion: 24.x` ≠ `.nvmrc` Node 20. Pre-existing drift, not introduced by this work.
- **Merge SHA into feature branch:** N/A — Phase 0 commit `30b9b98` lives on `design/01-tokens`; rolls into `feature/design-system` via the Phase 1 sub-PR.

### Phase 1 — Foundation: tokens + fonts + semantic classes

- **Date:** 2026-04-29
- **Sub-branch:** `design/01-tokens`
- **Commits:**
  - `8950662 feat(ui): land design-system token layer + self-hosted brand fonts` (Phase 1 work).
  - Bootstrap doc commits `30b9b98` and `e8ecc8f` from Phase 0 also ride on this sub-branch and will roll into `feature/design-system` together with the Phase 1 PR.
- **Files added:**
  - `packages/ui/tokens.css` (365 lines, verbatim copy of `project/colors_and_type.css`).
  - `packages/ui/fonts/*.ttf` (15 files: 9 Lexend weights + 6 DM Mono cuts).
- **Files modified:**
  - `packages/ui/package.json` — added `sideEffects: ["*.css"]` plus `./tokens.css` and `./fonts/*` exports. Kept `main`/`types` pointing at the empty `./index.ts` stub for Phase 2 primitives.
  - `apps/web/package.json` — single new dep entry `"@healtho/ui": "workspace:*"`. Lockfile delta is exactly that one workspace link line; zero new external packages.
  - `apps/web/src/index.css` — `@import '@healtho/ui/tokens.css';` at the top of the file (above the Tailwind directives so CSS vars are available everywhere downstream).
  - `apps/web/index.html` — removed the `https://fonts.googleapis.com/css2?family=Lexend...&family=DM+Mono...` `<link>`. Material Symbols Outlined `<link>` kept.
- **Files NOT modified (and why):**
  - `apps/web/tailwind.config.js` — design-system's `project/frontend/tailwind.config.js` is byte-identical to the in-repo file. No merge needed.
  - `apps/web/vite.config.js` — pnpm workspaces resolve `@healtho/ui` natively in Vite. The plan called this "optional flexibility"; skipped to keep the surface area small. Confirmed by the symlink at `apps/web/node_modules/@healtho/ui` resolving cleanly and `pnpm build` emitting all 15 TTFs into `dist/assets/`.
  - `vercel.json` — CSP already permits `font-src 'self'` (covers self-hosted) and `https://fonts.googleapis.com` / `https://fonts.gstatic.com` (covers Material Symbols + the in-token-file `@import url(...)`). Untouched.
- **Build verification:**
  - `pnpm install` → `Already up to date` (single workspace link added).
  - `pnpm build` → green in 6s; Vite emitted all 15 TTFs to `dist/assets/` with content hashes (e.g. `Lexend-Regular-peUU6jwM.ttf`). CSS bundle is 44.91 kB (gzip 8.92 kB) — accommodates the token layer.
  - Build emitted two **pre-existing** warnings (not introduced by this commit): `MODULE_TYPELESS_PACKAGE_JSON` for `apps/web/postcss.config.js` and the >500 kB JS chunk advisory. Both already tracked in the monorepo-migration follow-ups.
- **Vercel preview:**
  - Sub-branch deploy `dpl_CN2hcLNZAt1cdu1d11fQT9GUqNH4` at SHA `8950662` reached READY in ~15 s of build time. Stable alias: `https://healtho-git-design-01-tokens-ayushkapoor11s-projects.vercel.app/`.
  - `feature/design-system` still has no unique commits, so its `healtho-git-feature-design-system-...` alias is unbuilt — activates as soon as this sub-PR merges.
- **Browser smoke test (to perform on the preview URL):** load Landing → Login → Dashboard → Profile → trigger a calorie-goal celebration. Open DevTools → Network and confirm Lexend + DM Mono TTFs load from `/assets/...` (same-origin), not `fonts.gstatic.com`. Material Symbols may still load from Google Fonts (intentional). _Browser-side verification handed to the user — running tool can't sign in to Vercel preview-auth._
- **Security gates:**
  - `pnpm audit --audit-level=high` → "No known vulnerabilities found".
  - Lockfile delta inspected: only the `@healtho/ui` workspace link added; no new external packages.
  - Secret-scan grep run with `:!docs/design-system-execution-plan.md ':!packages/ui/fonts/*' ':!packages/ui/tokens.css'` exclusions → PASS.
  - SHA-256 baselines for the 15 self-hosted TTFs (integrity reference for future commits — any change without explanation is a red flag):
    - `a15c5f16fbfc45b97168f8cedd959149298639bc93e95c0f7be44f7de7508d5b  DMMono-Italic.ttf`
    - `23ed35b5229d8a55d15949efe2f7c4c817833edd82d03b241b3618640b417aa4  DMMono-Light.ttf`
    - `afb110e4fbc514e4bec9ba03d568b5088dccbe38f7046762db853f4c9318d73c  DMMono-LightItalic.ttf`
    - `8055df2253a84993c7f16586fac775f2f7fcf1bfd191fa23bc1058a58969782a  DMMono-Medium.ttf`
    - `f6b7a415ecfb6ab07c148fe53c9b03409ca1969c1d49758122a9515b93fdfe91  DMMono-MediumItalic.ttf`
    - `f98ada968dc3b6b2c08d3f5caaf266977df0bfe0929372b93df5a06cf2ace450  DMMono-Regular.ttf`
    - `073a809f89c38e2c0c475c14b891a7c7e7b20f193b04f1f4c3ffab1cb180391f  Lexend-Black.ttf`
    - `db820d3ccf6b1175e9c96d03e4f093835cb7525e1ae3289702362e43f82b24b3  Lexend-Bold.ttf`
    - `5779982cd883de4921cc64c4b99dc118e0c9817bbd191ef32f9033901d8e7370  Lexend-ExtraBold.ttf`
    - `7c7d62890f50b8299a10f33095dbb1086b6915d98d84adffcd9384378338352d  Lexend-ExtraLight.ttf`
    - `2a1322b3349ed31caa626125f1e820e2c11f549f7081e994858a3d2170e14f43  Lexend-Light.ttf`
    - `18086a9d53eb5e5f8afea3454d79e3b4df811c9f72500b872b8859e12f7ff374  Lexend-Medium.ttf`
    - `5f9ed62e28658e53a02cc8751566821e8515af753f18b02014669ed0341c9f5b  Lexend-Regular.ttf`
    - `6bf2212e71f48f136f59ad9583a68c0d323cd89801f35d5193927996c452ba8d  Lexend-SemiBold.ttf`
    - `e3b0c6e4290da959257cc5aba5f2de39c3f6426d39d6d1f9d9e9d1822461f648  Lexend-Thin.ttf`
- **Deltas vs. plan:**
  - **Tailwind config and `apps/web/src/index.css` keyframes/utilities were already byte-identical to the design-system source.** The plan listed them as "merge any missing tokens" / "merge any custom keyframes" — turns out nothing was missing. The current `index.css` keyframes (`ringFill`, `fadeUp`, `float`, `waterGlow`, `celebrationFadeIn`) duplicate identical definitions in `tokens.css`; identical, harmless, no override conflict. **Cleanup deferred to Phase 6 per the plan.**
  - The plan called for a `packages/ui/index.css` re-export wrapper that registers `@font-face` paths relative to the package. That wrapper is unnecessary because `colors_and_type.css` already contains the `@font-face` declarations with `fonts/...` paths, and Vite resolves those paths relative to the imported file's location automatically. **Skipped — saves a layer of indirection.** Anyone consuming `@healtho/ui/tokens.css` gets fonts registered for free.
  - The plan called for a `tokens.ts` TS const re-export for future React Native consumption. Plan flagged it as Phase-1.5 / deferrable; **not created.** RN consumption isn't in scope until Phase 4 of the product roadmap (separate from this design-system work).
  - The plan called for adding a `resolve.alias` for `@healtho/ui` in `vite.config.js`. **Skipped** — pnpm workspace symlink at `apps/web/node_modules/@healtho/ui → packages/ui` resolves natively; the build proves it. Adding the alias would have been redundant.
  - **`Lexend-VariableFont_wght.ttf` excluded** from the copy. The `colors_and_type.css` `@font-face` table only references the 9 static Lexend weights; the variable file would have shipped ~78 kB of dead bytes. Re-add later if any consumer references `font-variation-settings`.
- **Surprises / things to flag:**
  - **Material Symbols Outlined still loads from `fonts.googleapis.com`** — both via the kept `<link>` in `apps/web/index.html` AND via the verbatim `@import url(...)` at the top of `tokens.css`. Two parallel CDN paths to the same resource. This matches the inherited plan ("keep MS CDN for now") but contradicts the user's "same-origin assets only" hard rule. **Action item for a later phase:** decide whether to self-host MS (a 100-300 kB font, downloadable from Google) and strip the CDN — or accept the deviation, document it, and lock the CSP to those exact origins. Not a blocker for Phase 1 since brand fonts (Lexend + DM Mono) are now same-origin.
  - The verbatim `@import url('https://fonts.googleapis.com/...')` at the top of `tokens.css` means every consumer of the package implicitly fetches Material Symbols. If `packages/ui` ever feeds React Native, RN's CSS pipeline won't honor the `@import` (probably fine — RN renders icons differently — but worth noting).
  - The `Vercel project nodeVersion: 24.x` vs `.nvmrc: 20` drift noted in Phase 0 did NOT cause build issues — Vite/Tailwind on Node 24 worked. Still worth reconciling before Phase 7.
- **Merge SHA into feature branch:** `d7a74e7f70dde15adc31bdbb2e5dc276ff7329d2` (merge commit on `feature/design-system`, `--no-ff` to preserve all 4 sub-branch commits).
- **Sub-branch closed at:** `adef60e` (last commit on `design/01-tokens` before merge).
- **Browser smoke test result:** PASS. User verified Lexend + DM Mono load same-origin from `/assets/...`, Material Symbols still on Google CDN (expected), no FOUT, no console regressions, dashboard / log-food / profile-edit flows render identically to production.
- **Process delta:** internal PR was **not** opened on GitHub — `gh` CLI is not installed on the dev machine and the user authorized a direct local `--no-ff` merge as a one-time deviation since the smoke test had already validated the work on the Vercel preview. The merge commit message and this log section preserve everything a PR description would carry. Future sub-PRs (Phase 2 onward) should install `gh` or open the PR via web UI to keep the GitHub audit trail intact. _Tracked as a Phase 2 setup item._
- **Next:** Phase 2 starts on `design/02-primitives` (already cut off `feature/design-system@d7a74e7` and pushed). Build the primitives package (Button, Card, Input, Modal, Badge, IconButton, MealAvatar, MaterialIcon) in `packages/ui/components/`.

### Sync gate #1 — main → feature/design-system → design/02-primitives

- **Date:** 2026-04-30
- **Trigger:** PR #7 (`fix: add worker-src 'self' blob: to CSP for avatar Web Worker`) squash-merged into `main` at `efafab8`. Parallel hotfix to a pre-existing prod bug (Web Worker spawn from `blob:` blocked by CSP `script-src` fallback). NOT introduced by this migration. First invocation of the weekly sync gate the inherited plan calls for.
- **Pre-sync state:** `main` @ `efafab8`, `feature/design-system` @ `d7a74e7`, `design/02-primitives` @ `282d6b4`.
- **Step 1 — `main → feature/design-system`:** clean three-way merge via `ort` strategy. Only `vercel.json` changed (CSP `script-src` directive gained `worker-src 'self' blob:`). New head `4057ae4`. Pushed to origin.
- **Step 2 — `feature/design-system → design/02-primitives`:** identical clean merge. New head `dc1c0a9`. Pushed to origin.
- **Verification:** `grep -c "worker-src" vercel.json` returns `1` on `design/02-primitives` working tree — CSP fix absorbed.
- **Conflicts:** none. Phase 1 didn't touch `vercel.json`, so the hotfix lands cleanly.
- **Vercel preview rebuild:** sub-branch and feature-branch aliases will rebuild on push.
- **Surprises:** none.

### Phase 2 — Primitives package

- **Date:** 2026-04-30
- **Sub-branch:** `design/02-primitives`
- **Phase 2 commit:** `20f6c43 feat(ui): land Phase 2 primitives — Button, Card, Input, Modal, Badge, IconButton, MealAvatar, MaterialIcon`
- **Files added (8 primitives + barrel + preview page):**
  - `packages/ui/components/Button.jsx` — primary / secondary / ghost × sm / md / lg, fully round, focus ring `var(--tap-ring)`, height `var(--btn-h-*)`. Supports `as="a"` for anchor-styled buttons.
  - `packages/ui/components/Card.jsx` — default / elevated × padding sm / md / lg, optional decorative corner glow blob (`aria-hidden`, `pointer-events: none`).
  - `packages/ui/components/Input.jsx` — slate-900 surface, hairline border, brand focus ring (state-based, `useState` + `onFocus` / `onBlur` handlers), `forwardRef`, auto `useId`, optional leading icon + trailing `suffix` / `right` slot.
  - `packages/ui/components/Modal.jsx` — web centered modal, `createPortal(document.body)`, ESC handler, click-outside-to-dismiss, body-scroll lock, initial focus on dialog. Mobile bottom-sheet deferred per `PLATFORMS.md`.
  - `packages/ui/components/Badge.jsx` — gradient / pop / ok / warn / soft, optional leading icon. Uses `bg-primary/[0.15]`, `bg-fiber/[0.15]`, `bg-carbs/[0.15]` Tailwind opacity arbitrary values.
  - `packages/ui/components/IconButton.jsx` — circular icon-only, ghost / primary / plain × sm / md / lg, dev-only console warning when `aria-label` is missing.
  - `packages/ui/components/MealAvatar.jsx` — emoji avatar (meal types + activity-level pickers per the design rubric), supports custom child node (e.g. inner `MaterialIcon`), default + `gradient` variants. Inline `style={{ width, height, fontSize }}` because Tailwind can't take dynamic prop values for arbitrary classes.
  - `packages/ui/components/MaterialIcon.jsx` — renders icon name as text content `{name}` inside a `<span>`. **Never via `dangerouslySetInnerHTML` or any innerHTML sink.** FILL / wght / grade axes via `font-variation-settings`.
- **Files added (consumer):**
  - `apps/web/src/pages/_design-preview.jsx` — Storybook-style page rendering every primitive in every variant. Wires two Modal demos via `useState`. Uses semantic typography classes (`.h1`, `.body`, `.label-xs`, `.eyebrow`) shipped in Phase 1 tokens.
- **Files modified:**
  - `packages/ui/index.ts` — **deleted** (was the empty `export {}` stub from the monorepo migration).
  - `packages/ui/index.js` — **created** as the new barrel re-exporting all 8 primitives. Switched the package to ESM (`"type": "module"`), `main` → `./index.js`, `exports["."]` → `./index.js`. Added `peerDependencies` on `react ^18 || ^19` and `react-dom ^18 || ^19` so consumers wire React themselves; **zero new external packages downloaded** (`pnpm install` reported `Already up to date`; lockfile delta is purely the new internal `packages/ui` entry referencing the existing react/react-dom in `apps/web`).
  - `apps/web/src/App.jsx` — added `/_design-preview` route, lazy-loaded via `React.lazy()` so the chunk is only fetched when the gate allows it. Gate: `import.meta.env.DEV || hostname.startsWith('healtho-git-')`. Production hostnames fall through to `<NotFound />`.
- **Build verification:**
  - `pnpm install` → `Already up to date` (only the internal `packages/ui` lockfile entry changed).
  - `pnpm build` → green in 3.2 s. **511 modules transformed** (was 500 in Phase 1, +11 = primitives + barrel + preview page + lazy loader). Main bundle `+1.45 kB` (now 591.61 kB / 166.89 kB gzip) — primitives live in the lazy chunk, not the main one. **`_design-preview-UxFW3CFS.js` chunk** split out at **15.08 kB / 4.69 kB gzip** — exactly what `lazy()` should produce. CSS bundle `+0.52 kB` (now 45.43 kB / 9.01 kB gzip) for the new Tailwind utilities.
- **Vercel preview:**
  - `dpl_AZ5FXozbNoniLfSKECQuuKzieFLW` at SHA `20f6c43` reached READY.
  - Branch alias: `https://healtho-git-design-02-primitives-ayushkapoor11s-projects.vercel.app/`
  - Preview page: `https://healtho-git-design-02-primitives-ayushkapoor11s-projects.vercel.app/_design-preview`
- **Security gates:**
  - `pnpm audit --audit-level=high` → "No known vulnerabilities found".
  - **Zero new npm deps.** Lockfile delta is internal-only — `packages/ui` declaring peer deps on `react` / `react-dom` versions that were already resolved by `apps/web`. No download.
  - **No XSS sinks.** Verified: zero `dangerouslySetInnerHTML`, zero `eval`, zero `new Function`, zero inline event-handler attribute strings (`onclick=...`, `onload=...`). All event handlers wired through React's synthetic event system. `MaterialIcon` passes the icon name as a JSX text child, **never** as innerHTML.
  - **Secret-scan grep flagged one false positive** on `apps/web/src/pages/_design-preview.jsx` line: `<Input label="Password" icon="lock" type="password" placeholder="Enter your password" />`. This is the demo placeholder for the password Input variant in the preview page — UI demo text, not a credential. Manually verified clean. **The grep needs refining for Phase 3+** (it now also trips on legitimate UI strings around input/registration components). Suggested refinement: scan only `.env*`, `.json`, `.yaml`, `.yml`, `.toml` files (where credentials actually leak), or look for assignment-shaped patterns like `password\s*[:=]\s*['"]\S{6,}`.
  - **Same-origin assets only.** No new fonts / images / scripts loaded from external origins. Material Symbols continues to load from Google Fonts CDN per the inherited deviation flagged in Phase 1.
  - `vercel.json` — **not touched** (CSP fix already absorbed via sync gate #1).
  - Supabase RLS / auth / `.env` — **not touched**.
- **Deltas vs. plan:**
  - **`packages/ui/index.ts` → `packages/ui/index.js`.** The plan called for a "TypeScript const re-export" or `index.ts` barrel; the original stub was a `.ts` file. Switched to plain `.js` because the package contains zero TypeScript code and there's no `tsconfig.json` in `packages/ui` — keeping `.ts` would have been misleading metadata. `package.json`'s `main` updated to match.
  - **Added `peerDependencies` on `react` / `react-dom`.** Plan didn't explicitly call for this; rationale: future-proofing for downstream consumers (RN, Storybook host, npm-publish someday) and signals to pnpm/npm that the package expects React to come from the host. Costs nothing — pnpm doesn't install peers automatically here, and apps/web already provides them.
  - **Code-split `_design-preview` via `React.lazy`.** Plan said "gitignored or behind a flag — not shipped". Lazy loading + hostname/env gate is stronger than a flag because production users never even fetch the chunk. Gate also returns `<NotFound />` if someone manually navigates to `/_design-preview` on production. Plan's intent satisfied with cleaner bundle behavior.
  - **Modal close button uses `IconButton` with `variant="plain"`.** Adds an internal dependency between primitives (Modal → IconButton). Acceptable: keeps the modal's close affordance consistent with the rest of the icon-button vocabulary.
- **Surprises / things to flag:**
  - **Secret-scan command needs hardening.** Discussed under "Security gates" above. Will affect every future phase that touches form code (Register reskin, LogFoodModal, Profile). Recommended fix: scope the grep to credential-shaped patterns or to env/config file paths. Tracking as a Phase 2.5 chore.
  - **`peerDependenciesMeta` not declared.** Some consumers might prefer `peerDependenciesMeta.react.optional = false`. Skipped because we control all consumers in this monorepo. Re-evaluate if `@healtho/ui` ever publishes externally.
- **Visual QA:** PASS. User reviewed `/_design-preview`, approved as-is.
- **PR:** [#8](https://github.com/healtho-app/healtho/pull/8), merged 2026-04-30 via `gh pr merge --merge` (preserves all sub-branch commits).
- **Merge SHA into feature branch:** `4e98a85bde5d052e30c633a9755f71856f29b75d` (merge commit on `feature/design-system`).
- **Sub-branch closed at:** `4e36318` (last commit on `design/02-primitives` before merge).
- **Process delta vs. Phase 1:** internal PR opened via `gh` this time (installed at end of 2026-04-29 session). Audit trail now lives at GitHub.com/PR#8 in addition to the in-repo log. Remote sub-branch retained (not auto-deleted) for the audit trail; can be cleaned up at the end of the migration.
- **Next:** Phase 3 starts on `design/03a-readonly-components` (cut off `feature/design-system@4e98a85` and pushed). First sub-PR reskins `MacroCard`, `WaterTracker`, `CalorieRing`, `MealSection` to use the Phase 2 primitives. Sub-PRs 3b (`Header`) and 3c (`CelebrationOverlay`) follow on their own branches.
