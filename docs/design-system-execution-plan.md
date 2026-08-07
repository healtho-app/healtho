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

### Phase 3a — Read-only display components

- **Date:** 2026-04-30
- **Sub-branch:** `design/03a-readonly-components`
- **Phase 3a commit:** `9fe6a56 feat(app): Phase 3a — reskin read-only display components to spec`
- **Files reskinned:**
  - `apps/web/src/components/CalorieRing.jsx` — substantial visual redesign per `project/preview/comp-calorie-ring.html`. 130×130 → 160×160. **Remaining-first arc**: gradient stroke shows REMAINING calories; inner hairline arc shows consumed for context. Tick marks at 12 / 3 / 6 / 9 o'clock. Pink + cyan glow blobs in opposite corners. Stats now have inline mini progress bars + colored dots. State colors (brand gradient default, amber when remaining < 15%, green when met). **Reward animation**: `rewardPop` keyframe (from `@healtho/ui` tokens.css) fires once per goal-met transition via `useEffect` + transient state. Duration `var(--dur-reward)` honors `prefers-reduced-motion` automatically. Wraps in `Card` primitive. Tooltip preserved on Daily Goal label.
  - `apps/web/src/components/WaterTracker.jsx` — substantial visual redesign per `project/preview/comp-water-tracker.html`. 8 dots → 8 SVG glasses (tapered tumbler with proportional water gradient fill, surface highlight ellipse on partial fills, top reflection on full glasses, hover lift). Goal-met state: cyan border + cyan glow + linear-gradient bg + `Badge variant="ok" icon="check_circle"`. Title row gains `MaterialIcon` water_drop + "X / 8 glasses" count with proper `½` display. Wraps in `Card` primitive. All localStorage / waterLevel / manual-override / past-date logic preserved verbatim.
  - `apps/web/src/components/MealSection.jsx` — minimal: swapped 4 raw `<span class="material-symbols-outlined">` instances for the `MaterialIcon` primitive (single XSS-safe icon source). Spec already matched structurally.
- **Files INTENTIONALLY NOT modified:**
  - `apps/web/src/components/MacroCard.jsx` — current code byte-matches `project/preview/comp-macrocards.html` spec (slate-900 surface, hairline border, `rounded-xl`, colored dot, label, value/goal, bar). No structural or visual change needed. Logged as no-op-by-design rather than a forced reskin.
- **Build verification:**
  - `pnpm build` → green in 3.4 s.
  - Main bundle: 598.04 kB / 168.89 kB gzip (+6.43 kB vs Phase 2) — Card / Badge / MaterialIcon primitives are now imported by app components on `/dashboard`, so they live in the main bundle instead of the lazy `_design-preview` chunk.
  - `_design-preview` lazy chunk: 13.68 kB / 4.22 kB gzip (was 15.08 kB) — shrunk because primitives moved out via deduplication.
  - CSS bundle: 46.83 kB / 9.32 kB gzip (+1.40 kB) — new arbitrary-value Tailwind utilities (`-top-[60px]`, `w-[220px]`, `tracking-[0.14em]`, etc.).
- **Vercel preview:**
  - `dpl_9eXL2D3PcUbn2uzWivcr4V5T7PdV` at SHA `9fe6a56` reached READY.
  - Branch alias (Vercel hashed because branch name is long): `https://healtho-git-design-03a-readonly-479b75-ayushkapoor11s-projects.vercel.app/`
  - The hostname-gate for `_design-preview` (`startsWith('healtho-git-')`) still passes on the hashed alias.
- **Security gates:**
  - `pnpm audit --audit-level=high` → "No known vulnerabilities found".
  - **Zero new npm deps.** Lockfile unchanged this commit.
  - **No XSS sinks.** Verified: zero `dangerouslySetInnerHTML`, zero `eval` / `new Function`, zero inline event-handler attribute strings. All event handlers wired through React's synthetic event system. `MaterialIcon` continues to pass icon names as JSX text children.
  - **Refined secret-scan grep** (`(secret|api[_-]?key|access[_-]?token|bearer)\s*[:=]\s*['"]\S{12,}['"]|password\s*[:=]\s*['"][^'"]{6,}['"]|-----BEGIN\s+(RSA|OPENSSH|PRIVATE)`) → PASS. **First phase using the hardened pattern**; no false positives despite the components touching form state and Input primitive demos.
  - **Same-origin assets only.** No new external origins.
  - `vercel.json` — **not touched** (`worker-src` CSP fix already absorbed via sync gate #1).
  - Supabase RLS / auth / `.env` — **not touched**. CalorieRing / WaterTracker / MealSection don't talk to Supabase directly; they consume props from the Dashboard parent.
- **Deltas vs. plan:**
  - **MacroCard left untouched.** Plan listed it as one of four reskins; the comp-macrocards.html spec is already met by the current implementation. Forcing a no-op rewrite would have introduced risk for zero visual gain. Documented above.
  - **`Card` primitive doesn't expose a `radius` prop.** Spec uses `rounded-xl` (12 px) for tight chip cards (MacroCard, MealSection container) and `rounded-2xl` (16 px) for major data cards (CalorieRing, WaterTracker). I used `Card` for the latter two and kept raw `<div>` for the former. **Pickup for Phase 3.5 or earlier**: extend `Card` with a `radius="xl" | "2xl"` prop so all four cases can consume the primitive consistently. Minor — current Tailwind cascade (no `tailwind-merge`) makes className-based override unreliable.
  - **Tooltip preserved on `Daily Goal`.** Spec has no tooltip but the pre-Phase-3 `CalorieRing` had a `?` button explaining the BMR × activity ± fitness-goal calculation. Kept it because the user explicitly asked to preserve every prop / callback / data-flow contract; the tooltip is an accessibility-positive affordance whose removal would be a regression. Adapted to the new layout next to the "Daily Goal" stat label.
  - **`prefers-reduced-motion` already honored** for the rewardPop animation via `var(--dur-reward)` — no extra plumbing needed. The token collapses to 0 ms automatically per `tokens.css`.
- **Surprises / things to flag:**
  - **Vercel hashed the branch alias.** Branch name `design/03a-readonly-components` was longer than Vercel's internal limit, so the alias became `healtho-git-design-03a-readonly-479b75-...vercel.app` (a `479b75` hash replaces the rest of the name). The `_design-preview` route's hostname gate (`startsWith('healtho-git-')`) still passes. **Heads-up for Phases 3b, 3c, 4a–4d, 5**: shorter sub-branch names give cleaner aliases. Not a blocker.
- **Visual QA:** PASS. User reviewed reskins on `/dashboard`, approved as-is.
- **PR:** [#9](https://github.com/healtho-app/healtho/pull/9), merged 2026-04-30 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `1878f636b2406a230f37d1fa48576eb47017971d`.
- **Sub-branch closed at:** `d49e13a`.
- **Next:** user requested Phase 3.5 (close pickup #1) before Phase 3b.

### Phase 3.5 — Close pickup #1: extend Card primitive with `radius` prop

- **Date:** 2026-04-30
- **Sub-branch:** `design/03.5-card-radius` cut from `feature/design-system@1878f63`.
- **Phase 3.5 commit:** `942acb6 feat(ui): Phase 3.5 — extend Card with radius prop, retrofit MacroCard + MealSection`
- **Why:** Phase 3a flagged that the `Card` primitive only supported `rounded-2xl` (16 px), so `MacroCard` and `MealSection`'s container kept raw `<div>` shells with `rounded-xl` (12 px) per the chip-card spec. Closing the deviation now while context is fresh, before Phase 3b lands more chip-card consumers (Header notification chip, etc.).
- **Files modified:**
  - `packages/ui/components/Card.jsx` — adds `radius` prop with values `"none" | "lg" | "xl" | "2xl"`. Default stays `"2xl"` for backward compat — Phase 2 callers (CalorieRing, WaterTracker via Phase 3a, Modal, all `_design-preview` Card usages) render identically.
  - `apps/web/src/components/MacroCard.jsx` — wraps content in `<Card padding="sm" radius="xl">`, drops the raw `<div className="bg-slate-900 border ...">` shell. Visual output unchanged — identical surface, border, radius, padding.
  - `apps/web/src/components/MealSection.jsx` — wraps in `<Card padding="none" radius="xl">` (header + body retain their own padding via inner divs). Visual unchanged.
  - `apps/web/src/pages/_design-preview.jsx` — adds a `radius` demo row to the Card section showing all four options side-by-side for QA.
- **Build:** `pnpm build` green in 3.3 s. Main bundle 598.07 kB (essentially unchanged from Phase 3a `598.04 kB`). CSS bundle 46.86 kB (+0.03 kB). `_design-preview` chunk +0.6 kB for the new demo row.
- **Security gates:** pnpm audit clean, zero new deps, refined secret-scan PASS, no XSS sinks introduced, `vercel.json` not touched.
- **Visual QA:** PASS. User reviewed `/dashboard` (MacroCard + MealSection identical to Phase 3a) and `/_design-preview` Card section (new radius demo row showing 4 variants). Approved.
- **PR:** [#10](https://github.com/healtho-app/healtho/pull/10), merged 2026-04-30 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `53539f9409c0ddd9a2984ee501f6809493498a1f`.
- **Sub-branch closed at:** `4a8a97a`.
- **Next:** user greenlit Phase 3b (Header reskin) immediately after.

### Phase 3b — Header reskin

- **Date:** 2026-04-30
- **Sub-branch:** `design/03b-header` (short name per the Phase 3a Vercel-hashing learning) cut from `feature/design-system@53539f9`.
- **Phase 3b commit:** `feat(app): Phase 3b — Header reskin` (SHA appended below post-push).
- **File modified:** `apps/web/src/components/Header.jsx`.
- **Visual changes:**
  - Header height now driven by `--nav-height` token via `style={{ minHeight: 'var(--nav-height)' }}` — yields 72 px on web, 56 px on mobile (per `data-platform="mobile"` swap). Replaces the previous `py-4` (≈56 px).
  - Horizontal padding now `px-[var(--page-gutter)]` — fluid `clamp(1rem, 4vw, 3rem)` on web. Replaces the previous fixed `px-6 lg:px-10`.
  - Wordmark: `text-xl font-extrabold tracking-[-0.015em]` — matches Primitives.jsx `AppHeader` spec (was `font-bold tracking-tight`).
  - Right-link hover-underline pattern per SKILL.md web nav: `hover:underline underline-offset-4 decoration-primary/60`. Same affordance for keyboard users via `focus-visible:shadow-[var(--tap-ring)]`.
  - Avatar bumped from 32 → 36 px (`w-8 h-8` → `w-9 h-9`) so the avatar visually pairs with the wordmark icon (also 36 px) and matches the Primitives.jsx `AppHeader` round-button right-side affordance size.
  - Logout button: same icon+text layout, but icon is now via `MaterialIcon` primitive and the focus ring uses the brand `--tap-ring` token.
  - 3 raw `<span class="material-symbols-outlined">` instances → `MaterialIcon` primitive (rightIcon, logout icon, progress_activity spinner).
- **Behavior preserved (verified line-by-line):**
  - All four props (`rightLabel`, `rightTo`, `rightIcon`, `showLogout`) unchanged.
  - `useEffect` auth-state setup: `getSession` then `onAuthStateChange` subscription, unsubscribe on unmount — verbatim.
  - `handleLogout` flow: setSigningOut → `supabase.auth.signOut()` → `navigate('/login', { replace: true })` — verbatim.
  - Logo route logic: `/dashboard` if session, `/login` otherwise — verbatim.
  - Avatar fallback: `avatar_url` image if present, else two-letter initials from `full_name` — verbatim.
  - Mobile-hidden "Sign out" text via `hidden sm:inline` — preserved.
- **Primitives consumed:** `MaterialIcon` (3 usages). `IconButton` / `Badge` / `Card` deliberately NOT used — the rightLabel link has icon+text, the logout has icon+text, the avatar is a `<Link>` wrapping an image/initials, and the header surface is a `<header>` not a card. Forcing a primitive into any of these would create a worse fit than the explicit markup.
- **Build verification:** `pnpm build` green in 4.0 s. Bundle deltas to be filled in post-build (typical: main bundle within ±1 kB, lazy chunk unchanged, CSS bundle minor +).
- **Security gates** (to be verified pre-push): `pnpm audit` clean, no new deps, hardened secret-scan clean, no XSS sinks (zero dangerouslySetInnerHTML/eval/inline event-handler strings), Supabase auth flow `auth.getSession` + `auth.signOut` + `auth.onAuthStateChange` UNCHANGED — same call sites, same arguments, same handlers — only the visual frame around them differs. `vercel.json` not touched. `.env` not touched.
- **Smoke-test scope** (wider than Phase 3a — Header is everywhere):
  - `/` (landing) — public header (no profile, no logout, no rightLabel) renders correctly
  - `/login` — auth header renders
  - `/register` — auth header renders
  - `/dashboard` — authenticated header renders, profile avatar visible, logout button visible, all auth-state transitions still work
  - `/profile` — authenticated header renders, "My Profile" link target context (already on the profile page — link should behave correctly)
  - LogFoodModal trigger from `/dashboard` — modal opens, header still visible behind backdrop
  - Mobile viewport (390 px) — header doesn't overflow, "Sign out" text hides, hamburger-style works
- **Deltas vs. plan:**
  - **Avatar bumped 32 → 36 px.** Spec didn't explicitly call for this; rationale: visual symmetry with the wordmark icon (also 36 px) and consistency with the Primitives.jsx `AppHeader` round-button affordance size on the right. Doesn't change the touch-target floor. Document so we don't churn it back.
- **Visual + functional QA:** PASS. User reviewed all routes across the design/03b-header preview, approved as-is.
- **PR:** [#11](https://github.com/healtho-app/healtho/pull/11), merged 2026-04-30 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `cdbde278610d5091c0e3c091a4df98f2d9027248`.
- **Sub-branch closed at:** `819da89`.
- **Vercel alias confirmation:** `healtho-git-design-03b-header-...vercel.app` resolved cleanly without hashing — naming heuristic confirmed for all remaining sub-branches.

### Phase 3c — CelebrationOverlay reskin (wires reward keyframes)

- **Date:** 2026-04-30
- **Sub-branch:** `design/03c-celebration` cut from `feature/design-system@cdbde27`.
- **Phase 3c commit:** `feat(app): Phase 3c — CelebrationOverlay reskin` (SHA appended below post-push).
- **File modified:** `apps/web/src/components/CelebrationOverlay.jsx`.
- **Visual changes (per `project/ui_kits/app/ProfileCelebration.jsx` `CelebrationScreen` + `comp-celebration.html`):**
  - **Card:** `bg-surface` (`#0e0b1e`) with `border-slate-700/50`, `border-radius: 20px` (between Card primitive's xl=12 and 2xl=16; explicit inline `borderRadius: 20`), custom `boxShadow: 0 25px 50px -12px rgba(0,0,0,0.7), 0 0 80px rgba(<variant>,0.25)` per-variant glow.
  - **Badge:** 80×80 round, `bg-{variant}/20` + dual-ring shadow `0 0 0 5px rgba(<variant>,0.25), 0 0 30px rgba(<variant>,0.4)` (replaces the prior single `ring-4` Tailwind utility).
  - **Decorative burst behind badge:** new 128×128 round element with radial-gradient (`rgba(<variant>,0.45) 0%, transparent 60%`), runs `rewardBurst` keyframe once on mount (Phase 1 token wiring goal).
  - **Title:** 26 px font-extrabold `tracking-[-0.015em]` (was 24 px `tracking-tight`), with a brighter-white-to-violet-to-white gradient swept via `rewardShimmer` keyframe + `background-clip: text` once on mount. Sits over a transparent fill so the gradient shows through the glyphs.
  - **Subtitle:** `text-slate-300` (was `text-slate-400`) at 14 px line-height 1.55.
  - **Static decorative confetti:** 12 fixed-position rectangles (per ProfileCelebration spec), brand palette only, each with `box-shadow: 0 0 8px ${color}80` glow, `transform: rotate(...)`. Layered around the card during entry, in addition to the existing canvas-confetti dynamic bursts.
  - **3 raw `<span class="material-symbols-outlined">`** (only one in the original) → `MaterialIcon` primitive with `fill={1}` (filled icon).
- **Reward animations wired (Phase 3c's main brief goal):**
  - `rewardPop` on the badge — entry pop, scale 0.6 → 1.12 → 0.96 → 1, duration `var(--dur-reward)`, easing `var(--ease-spring)`.
  - `rewardBurst` on the decorative gradient circle — 0.1s delay, runs once, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - `rewardShimmer` on the title text — 0.4s delay (after badge pop), runs once, `ease-out`.
  - All three durations reference `var(--dur-reward)` so `prefers-reduced-motion` (which sets `--dur-reward: 0ms` in `tokens.css`) collapses them automatically. SKILL.md non-negotiable §15 honored without extra plumbing.
- **Behavior preservation (verified line-by-line):**
  - Props (`visible`, `variant`, `onDismiss`) — unchanged.
  - VARIANTS map — same 'water' and 'meals' keys, same icon/title/subtitle copy. Added per-variant fields for badgeShadow, burstGradient, cardGlow.
  - canvas-confetti library calls — verbatim. Same particle counts (120 + 60), same spread (80, 100), same origins, same `disableForReducedMotion: true`, same `BRAND_COLORS` palette.
  - Audio chime — verbatim try/catch around `new Audio('/sounds/celebration.wav')`, volume 0.5, silent failure.
  - Auto-dismiss — same 5000 ms timer with cleanup.
  - Click-anywhere-to-dismiss — preserved (root onClick + inner stopPropagation).
  - "Tap anywhere to dismiss" hint button — preserved with new focus ring via `--tap-ring`.
  - `hasPlayed` ref guard preventing duplicate confetti / chime on re-renders — preserved.
- **Primitives consumed:** `MaterialIcon` (1 usage with `fill={1}` + `size={40}` + className for color). `Modal` deliberately NOT used — its `bg-slate-900` / `rounded-2xl` / `--shadow-2xl` defaults don't match the celebration's `bg-surface` / 20-px-radius / per-variant glow shadow, and overriding via `className` is fragile without `tailwind-merge`. `Card` deliberately NOT used — needs 20-px radius which the Phase 3.5 prop set doesn't expose (closest is xl=12 or 2xl=16).
- **Build:** `pnpm build` green in 3.7 s.
- **Security gates:** `pnpm audit` clean, zero new deps, hardened secret-scan to be verified pre-push, no XSS sinks (zero `dangerouslySetInnerHTML` / `eval` / inline event-handler strings), `vercel.json` not touched, Supabase / `.env` not touched. canvas-confetti library was already present (pre-Phase-3 dep).
- **Smoke-test scope:**
  - **Trigger the celebration on `/dashboard`** (hit calorie goal in test data OR fill 8 water glasses) — confirm the overlay appears, badge pops in, decorative burst fades behind, title shimmers, confetti library bursts fire.
  - **Variant `water`** (8 glasses filled) — cyan dual-ring + cyan glow + water_drop icon + "Hydration Goal Complete!" title.
  - **Variant `meals`** (calorie goal hit) — violet dual-ring + violet glow + emoji_events icon + "Daily Goal Met!" title.
  - **Click anywhere** dismisses; auto-dismiss fires after 5 s if untouched.
  - **`prefers-reduced-motion: reduce`** — overlay still appears with all elements in their final state, but the rewardPop/rewardBurst/rewardShimmer animations don't play (durations collapse to 0). Verify in macOS System Preferences → Accessibility → Display → Reduce Motion, or DevTools → Rendering → "Emulate CSS prefers-reduced-motion".
  - **Audio chime** — fires once per celebration (or silently fails if browser blocks autoplay).
- **Deltas vs. plan:**
  - **Card primitive not used for the celebration card.** Spec wants 20 px radius which the Phase 3.5 `radius` prop doesn't expose (the prop has none/lg/xl/2xl mapping to standard Tailwind values 0/8/12/16; 20 is non-standard). Keeping raw `<div>` with explicit `borderRadius: 20`. **Pickup candidate**: Card primitive could expose a `radius="3xl"` (24 px) or accept arbitrary numeric values, but that's primitive-design churn for one consumer; flagging for awareness, not requesting.
  - **Modal primitive not used for the overlay.** Modal's hardcoded `bg-slate-900 / rounded-2xl / shadow-[var(--shadow-2xl)]` doesn't fit the celebration's `bg-surface / 20-px / per-variant glow`. Overriding via `className` is unreliable without `tailwind-merge`. Keeping the explicit overlay logic — it's only ~20 lines of JSX and matches the spec exactly.
- **Visual + functional QA:** PASS. User verified both variants (water + meals) on the design/03c-celebration preview, all three reward keyframes fired, approved.
- **PR:** [#12](https://github.com/healtho-app/healtho/pull/12), merged 2026-04-30 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `c6ab246186fd15588553a00d1490b184bccc8c75`.
- **Sub-branch closed at:** `6f5f579`.
- **Closes the 3-series.** Six in-app components reskinned across PRs #9 / #10 / #11 / #12; one primitive prop added (Card `radius`); all three Phase 1 reward keyframes now firing in real surfaces.

### Phase 3d — Self-host Material Symbols Outlined (closes Pickup A)

- **Date:** 2026-05-01
- **Sub-branch:** `design/03d-self-host-ms` cut from `feature/design-system@c6ab246` (no overnight activity on main; sync gate #2 not needed).
- **Phase 3d commit:** `feat(ui): Phase 03d — self-host Material Symbols Outlined` (SHA appended below post-push).
- **Why:** Closes Pickup A from earlier briefs. Eliminates the last third-party font CDN. Honors the same-origin hard rule.
- **Font source:**
  - **Repo:** `google/material-design-icons`
  - **Pinned commit SHA:** `481507587f1bdfe712939398c4dc0ecc2079ea7c` (master HEAD on 2026-05-01; the repo's tagged releases are stale — last tag `4.0.0` is from 2020-08-31, predates Material Symbols).
  - **Path in repo:** `variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2`
  - **Source URL:** `https://raw.githubusercontent.com/google/material-design-icons/481507587f1bdfe712939398c4dc0ecc2079ea7c/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.woff2`
  - **Size:** 3,924,340 bytes (3.92 MB)
  - **License:** Apache-2.0. Preserved at `packages/ui/fonts/MaterialSymbolsOutlined-LICENSE.txt` (downloaded from the same SHA's repo root `LICENSE`).
- **Files added:**
  - `packages/ui/fonts/MaterialSymbolsOutlined-Variable.woff2` (3.92 MB).
  - `packages/ui/fonts/MaterialSymbolsOutlined-LICENSE.txt` (11.1 KB).
- **Files modified:**
  - `packages/ui/tokens.css` — replaced the `@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0')` line with a self-hosted `@font-face` block:
    - `font-family: 'Material Symbols Outlined'` (exactly the same name so all `.material-symbols-outlined` class consumers + every `MaterialIcon` primitive call keep working without code changes)
    - `font-weight: 100 700` (variable axis range; the other three axes — FILL 0..1, GRAD -50..200, opsz 20..48 — are accessed via `font-variation-settings` on individual icons, no `@font-face` shorthand exists)
    - `format('woff2-variations'), format('woff2')` dual src for browsers that don't support variable-font format hint
    - `font-display: swap` (consistent with other brand fonts)
  - `apps/web/index.html` — removed the Google-Fonts `<link>` for Material Symbols AND the now-unused `<link rel="preconnect">` lines for `fonts.googleapis.com` and `fonts.gstatic.com`. Replaced with a comment explaining all brand fonts now load self-hosted via `@healtho/ui/tokens.css`.
- **SHA-256 baselines (integrity reference, alongside the 15 brand-font baselines from Phase 1):**
  - `18a28007e1ed51425059d3ceed5629ed48977e2a894d90e8f0a38e76880fce19  MaterialSymbolsOutlined-Variable.woff2`
  - `58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd  MaterialSymbolsOutlined-LICENSE.txt`
- **Build verification:**
  - `pnpm build` → green in 3.9 s.
  - Vite emitted `dist/assets/MaterialSymbolsOutlined-Variable-OqZILbjW.woff2` (3,924.34 kB — matches source byte-for-byte; Vite copies as-is, woff2 is already compressed).
  - Main JS bundle: 600.63 kB / 169.94 kB gzip (+2.6 kB vs Phase 3c — picks up the woff2 asset reference).
  - CSS bundle: 46.94 kB / 9.34 kB gzip (essentially unchanged).
- **Codebase audit (grep for residual external references):**
  - `apps/web/index.html`, `packages/ui/tokens.css` — clean (no Google-Fonts URLs).
  - `vercel.json` CSP still whitelists `fonts.googleapis.com` (style-src) and `fonts.gstatic.com` (font-src). No longer needed but **not touched per the user's hard rule.** Tightening the CSP to drop these is a Phase 6 polish candidate.
  - `ui-demos/healtho-register.html` + `ui-demos/healtho-profile.html` — static GitHub Pages mockups outside the React app, NOT in the migration's scope. Still load Google Fonts; intentionally untouched.
  - `apps/web/src/components/ProtectedRoute.jsx` + `apps/web/src/components/ProfileLoadError.jsx` — use raw `<span class="material-symbols-outlined">` instead of the `MaterialIcon` primitive. **They still render correctly** because the `.material-symbols-outlined` CSS class in `tokens.css` continues to resolve to `font-family: 'Material Symbols Outlined'`, and our self-hosted `@font-face` uses the exact same family name. Migrating these to the `MaterialIcon` primitive is a future cleanup (not in 3d's scope; may roll into Phase 4c when Profile gets reskinned).
- **Security gates:**
  - `pnpm audit --audit-level=high` → "No known vulnerabilities found".
  - **Zero new npm deps.** Pure asset + CSS change. Lockfile unchanged.
  - **No XSS sinks.** Verified: zero `dangerouslySetInnerHTML` / `eval` / inline event-handler strings introduced.
  - **Hardened secret-scan** to be verified pre-push.
  - **Same-origin assets:** the font now bundles into Vite's `/assets/` and Vercel serves it from the same origin. **Verification depends on user's DevTools Network-tab QA on the preview** — confirm zero requests to `fonts.googleapis.com` or `fonts.gstatic.com` after reload.
  - `vercel.json` not touched.
  - Supabase RLS / auth / `.env` not touched.
- **Variable-font axes verified to match what the app uses:**
  - `MaterialIcon.jsx` sets `font-variation-settings: 'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' 24` — all four axes are present in the variable WOFF2 (filename literally encodes `[FILL,GRAD,opsz,wght]`).
- **Deltas vs. plan:**
  - **Pinned to a master commit SHA, not a tagged release.** Plan suggested "tagged release of google/material-design-icons on GitHub" but the repo's last tag is `4.0.0` from 2020-08-31, which predates Material Symbols entirely. Master HEAD is the only place the variable font lives. Pinned to the exact SHA `481507587f1bdfe712939398c4dc0ecc2079ea7c` — equally reproducible (commits are immutable on Git), just not tagged.
  - **Removed the unused preconnect `<link>`s** as well as the Material Symbols `<link>` from `apps/web/index.html`. Plan only called out the Material Symbols `<link>`; the preconnects to `fonts.googleapis.com` and `fonts.gstatic.com` were redundant once all three font families self-host (Lexend + DM Mono since Phase 1, Material Symbols now). Cleanup-on-the-way.
- **Surprises / things to flag:**
  - **`vercel.json` CSP entries for `fonts.googleapis.com` (style-src) and `fonts.gstatic.com` (font-src) are now dead permissions.** Tightening the CSP is a Phase 6 polish candidate (with user approval, since the hard rule restricts CSP changes).
  - **`ProtectedRoute.jsx` and `ProfileLoadError.jsx` not migrated to `MaterialIcon` primitive yet.** They render correctly with the self-hosted font (CSS class continues to work) but they bypass the primitive's XSS-safe text-content guarantee. Worth picking up during Phase 4c (Profile reskin) since `ProfileLoadError` lives near the Profile flow.
- **Visual + same-origin QA:** PASS. User confirmed via DevTools Network tab on the design/03d-self-host-ms preview that ZERO requests hit `fonts.googleapis.com` or `fonts.gstatic.com`. All four font assets — three Lexend cuts + the new `MaterialSymbolsOutlined-Variable-OqZILbjW.woff2` — load from the same Vercel origin (`/assets/`). The "same-origin assets only" hard rule is now fully honored.
- **PR:** [#13](https://github.com/healtho-app/healtho/pull/13), merged 2026-05-01 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `9c54d1f471bfb899dc891a966e6a6eed9db465eb`.
- **Sub-branch closed at:** `9c8e4a4`.
- **Pickup A is officially CLOSED.** All three brand-font families (Lexend, DM Mono, Material Symbols Outlined) self-hosted with no third-party CDN dependencies remaining in the React app.

### Phase 4a — Dashboard page reskin

- **Date:** 2026-05-01
- **Sub-branch:** `design/04a-dashboard` cut from `feature/design-system@9c54d1f` (no overnight activity on main; sync gate #2 not needed).
- **Phase 4a commit:** `feat(app): Phase 4a — Dashboard page reskin` (SHA appended below post-push).
- **File modified:** `apps/web/src/pages/Dashboard.jsx` (508 lines pre-reskin).
- **Why:** Highest-traffic screen. Page-level chrome + section composition + typography hierarchy now match `project/ui_kits/app/Dashboard.jsx` spec while leaving every state hook, callback, supabase query, and computed value verbatim. Visual reskin only — props in, same data out.
- **Visual changes (page-level only — components themselves were reskinned in Phase 3):**
  - **MEAL_META emojis updated** to match SKILL.md non-negotiable §8 (emoji only in meal-types and activity-pickers, with a fixed palette). Was `🌅 / ☀️ / 🌙 / 🍎`, now `🍳 / 🥗 / 🍽️ / 🍎` per the rubric. This is a constant local to the file; no API/data-shape impact.
  - **Greeting block** retitled to match Primitives.jsx-derived spec: `text-3xl font-extrabold tracking-[-0.02em]` (was `text-4xl tracking-tight`); first name now wrapped in `text-gradient` semantic class (Phase 1 token); subtitle changed from `text-slate-500` to `text-slate-400` per spec body color.
  - **Date navigator** chevrons swapped from raw buttons to `IconButton variant="plain" size="sm"` primitive consumers; "Today" quick-jump styled to match `Badge variant="pop"` shape (raw button retained because Badge isn't a clickable primitive — see deltas).
  - **Meals header** "+ Log food" inline trigger uses `MaterialIcon` for the `add` icon plus the SKILL.md hover-underline pattern with `--tap-ring` focus ring (matches Header's right-link affordance).
  - **Empty-state card** (no entries on past dates) now wraps in `Card padding="lg" radius="xl"` primitive consumer; replaces the prior raw `<div>` shell. Same visual, primitive consumption is consistent.
  - **Streak card** is the biggest single change: brand-gradient flame circle replaces the slate emoji box. 44 px round, `bg-brand-gradient` fill, `MaterialIcon name="local_fire_department" fill={1}` icon, soft violet shadow `shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)]`. Streak title moves from display font to DM Mono (`font-mono text-base font-bold`) per Primitives.jsx spec. Subtitle color shifts from `text-green-400` to `text-fiber` (the design-system green token, `#4caf7d`). Right-side trophy icon swaps from raw `<span>` to `MaterialIcon`.
  - **Log Food CTA** (bottom of page) replaces the prior solid-primary `<button>` with `Button variant="primary" size="lg"` (brand-gradient fill + soft violet shadow + rounded-full per Phase 2 primitive). Leading `MaterialIcon name="add_circle" fill={1}`.
  - 4 raw `<span class="material-symbols-outlined">` instances → `MaterialIcon` primitive (chevron_left, chevron_right via IconButton; emoji_events; add_circle via Button child).
- **Behavior preservation (verified line-by-line):**
  - Every `useState` hook signature unchanged: `logOpen, logMeal, logs, streak, selectedDate, editEntry, waterTotalLevel`.
  - `useProfile()` hook contract unchanged.
  - `fetchLogs` callback unchanged — same supabase query, same `selectedDate` dependency, same error logging.
  - Streak `useEffect` unchanged — same dedup-by-date logic, same yesterday-cutoff check, same loop.
  - `handleDelete` and `handleEdit` flows unchanged.
  - All derived totals (`totalCalories / Protein / Carbs / Fat / Fiber`, `calorieGoal`, `waterLevel`, `waterGoalMet`, `mealGoalMet`) computed identically.
  - `useCelebration` hook calls unchanged with identical args.
  - `computeMacroTargets` and `pctOf` and `macros` array unchanged.
  - `meals` array mapping unchanged (including `unitCalories / unitProtein / unitCarbs / unitFat / unitFiber` derivations needed by the edit modal).
  - Date navigator state machine unchanged — `goBack`, `goForward`, `isToday`, `isAtEarliest`, `dateLabel` all verbatim.
  - Profile error fallback (blocks vs partial vs none) unchanged.
  - Footer copy unchanged.
  - LogFoodModal + 2 CelebrationOverlay instances at the bottom of the tree mounted with the same props.
- **Primitives consumed:** `Button` (1), `Card` (1, on the empty-state for past dates), `IconButton` (2, for date chevrons), `MaterialIcon` (4 usages in this page; the Streak card's flame, the Streak card's trophy, the meals-header `add`, and the empty-state's `add`).
- **Build:** `pnpm build` green in 2.9 s. Bundle deltas to be filled in post-push.
- **Security gates:** `pnpm audit` clean, zero new deps, hardened secret-scan to be verified pre-push, no XSS sinks (zero `dangerouslySetInnerHTML` / `eval` / inline event-handler strings; the only inline-style usage is on the `aria-hidden` wrapper for the forward-chevron's hide-when-today state, which is just an opacity toggle), `vercel.json` not touched, Supabase RLS / auth / `.env` not touched.
- **Smoke-test scope** (highest-traffic screen, deeper than 3-series):
  - `/dashboard` logged in: page loads, all sections render, greeting reads correctly with first name + 👋
  - Date navigator: back/forward chevrons toggle, "Today" pill appears when off-today, history floor at 30 days disables back chevron
  - CalorieRing: live consumed/goal/burned, reward animation fires on goal-met transition
  - MacroCard strip: 4 cards, over-warning red on carbs/fat
  - WaterTracker: log a glass via tap → visual update + persistence
  - Meal sections: add via "+", edit, delete-with-confirm; all four meal types use the rubric emojis (🍳 / 🥗 / 🍽️ / 🍎)
  - Empty state: navigate to a past date with no logs → Card-wrapped empty state with "Add an entry for this day" link
  - Streak card: gradient flame circle, mono "X day streak" title, green subtitle, trophy icon right-side; tooltip still appears on hover with the streak rules
  - Log Food CTA: `Button` primary triggers LogFoodModal with no defaultMeal preset
  - LogFoodModal: opens, every interaction works (food log persists, modal closes)
  - CelebrationOverlay: hit calorie goal in test data → reward animations fire (rewardPop on badge, rewardBurst behind, rewardShimmer on title)
  - Header (Phase 3b reskin): wordmark gradient, profile avatar, Sign out — all still working
  - Profile menu in Header: opens, navigates to /profile
  - Mobile viewport (390 px in DevTools): no layout breaks
  - Tablet viewport (768 px): layout adapts cleanly
  - Console clean apart from the known vercel.live preview-toolbar CSP block
- **Deltas vs. plan:**
  - **MEAL_META emojis updated.** Plan said "behavioral preservation: every prop, every callback, every data-flow contract stays the same." MEAL_META is a local constant; the emoji field is purely display. Updated to match SKILL.md §8 rubric (which is a non-negotiable). Database `meal_type` keys (`breakfast`, `lunch`, `dinner`, `snacks`) are untouched.
  - **"Today" quick-jump kept as a raw button styled to match Badge.** Badge primitive has no `onClick` / `aria-pressed` semantics; making it clickable would either require extending the primitive or wrapping Badge in a button. Either fight is bigger than the styling gain. Used the same color tokens (bg-primary/[0.15], text-violet-300, border-primary/35, font-display) so the visual matches Badge variant="pop" exactly. Documented.
  - **Streak card stayed as raw `<div>` with the inner card surface inlined.** Card primitive has `overflow-hidden` baked in, which would clip the streak card's tooltip (positioned absolute outside the card's bounds). Tooltip is a sibling of the card-shape, both children of an outer `relative group` wrapper. Decision: don't extend Card with an `overflow` prop in this phase per the "don't fabricate primitives in this phase" rule; keep raw div for streak only. Pickup candidate: add `overflow="visible"` prop to Card for tooltip-friendly card surfaces.
- **Visual + functional QA:** PASS. User reviewed the design/04a-dashboard preview, approved.
- **PR:** [#14](https://github.com/healtho-app/healtho/pull/14), merged 2026-05-01 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `eb119ba609bf9807b078c6e2e2ba5510335f5da9`.
- **Sub-branch closed at:** `c1e6b63`.
- **Highest-traffic screen reskinned with zero behavioral changes.**

### Phase 4b — Login + Register reskin (entry-level)

- **Date:** 2026-05-01
- **Sub-branch:** `design/04b-auth` cut from `feature/design-system@eb119ba`.
- **Phase 4b commit:** `feat(app): Phase 4b — Login full reskin + Register entry-level updates` (SHA appended below post-push).
- **Files modified:**
  - `apps/web/src/pages/Login.jsx` (242 lines pre-reskin) — **full reskin**.
  - `apps/web/src/pages/Register.jsx` (1,578 lines) — **minimal targeted updates only.** Scope documented in deltas.
- **Login full reskin** per `project/ui_kits/app/AuthScreens.jsx` `LoginScreen`:
  - Decorative auth-page glow blobs (top-left pink, bottom-right cyan) per spec.
  - Heading: `text-3xl font-extrabold tracking-[-0.02em]` (was `text-4xl tracking-tight`).
  - Subtitle bumped from `text-lg` to `text-base` for tighter reading.
  - Email field swapped to `Input` primitive (icon + label + autocomplete).
  - Password field swapped to `Input` primitive with `right` slot for the visibility toggle (the eye button stays in-line; cleaner than the prior absolute-positioned overlay).
  - "Forgot password?" link gains hover-underline + `--tap-ring` focus ring per SKILL.md.
  - Submit button replaced with `Button variant="primary" size="lg"` (brand gradient, soft violet shadow, rounded-full); loading state preserved via conditional MaterialIcon.
  - "Continue with Google" replaced with `Button variant="secondary" size="md"` (slate-900 surface, hairline border, rounded-full).
  - Server-error banner uses `MaterialIcon` for the warning icon.
  - 6 raw `<span class="material-symbols-outlined">` → `MaterialIcon`.
  - **Header kept** (delta vs spec — see below).
- **Register reskin (deeper pass on user request):**
  - Added `import { MaterialIcon } from '@healtho/ui'`.
  - **`FieldError` shared component** uses `MaterialIcon` for the error glyph + `font-display` class — touches every step's validation UX uniformly.
  - **All 46 raw `<span class="material-symbols-outlined">` instances → `MaterialIcon` primitive** across all 7 steps. Includes form-label icons (person, mail, lock, height, monitor_weight, calendar_today, wc, alternate_email, location_on, phone, flag), submit-button icons (progress_activity, arrow_forward, mark_email_read, check_circle), state-banner icons (warning, person_check, info, error), inline action icons (close, edit, refresh, login, calculate, schedule, expand_more, mark_email_unread), and the conditional check_circle on fitness-goal + activity-level radio rows (template-literal classNames preserved).
  - **Progress bar redesigned to spec pattern** (`AuthScreens.jsx` `RegisterScreen`): single-bar percentage replaced with 4 equal segments. Completed segments use `bg-primary` + soft violet glow (`shadow-[0_0_8px_rgba(139,92,246,0.4)]`); pending segments use `bg-slate-800`. "Step X/4" micro label uses the Phase 1 `.label` semantic typography class.
  - **Submit buttons NOT converted to `Button` primitive.** Each step's submit `<button>` has unique conditional content (loading-state JSX with progress_activity spinner + step-specific verb like "Creating account…" / "Verifying…" / "Saving…" / "Crunching numbers…"). Wrapping each in the primitive would change DOM structure across 5 buttons with 5 distinct text contents, increasing regression surface against the primary user benefit (visual consistency) — the buttons already use brand-primary background, soft violet shadow, and rounded-12px shape that's visually close enough to the primitive. The icons inside them now go through MaterialIcon.
- **Behavior preservation (Login + Register):**
  - Every form-handler (`set`, `submit`, `signInWithGoogle` on Login; the entire 7-step state machine on Register) verbatim.
  - All Supabase calls (`auth.signInWithPassword`, `auth.signInWithOAuth`, `seedProfile`, OTP verify/resend, `profiles` upsert calls) verbatim — same arguments, same handlers.
  - All validators (`validateStep1`, `validateStep3`, `validateStep4`, `validateStep5`, `validatePhone`, Login's `validate`) verbatim.
  - Imperial/metric unit toggle, country picker autocomplete, BMI gauge, OTP input, summary screen — all UNTOUCHED.
  - `prefillEmail` location-state pickup on Login verbatim.
  - Google OAuth `redirectTo: ${window.location.origin}/auth/callback` flow verbatim.
- **Primitives consumed (Login):** `Button` (2), `Input` (2), `MaterialIcon` (6).
- **Primitives consumed (Register):** `MaterialIcon` (47 usages — the FieldError helper + 46 step-internal icons).
- **Build:** `pnpm build` green in 3.1 s.
- **Security gates:** `pnpm audit` clean, zero new deps, hardened secret-scan to be verified pre-push, no XSS sinks introduced, `vercel.json` not touched, Supabase auth flow + `.env` not touched.
- **Smoke-test scope** (per the user's "extra QA on every flow" guardrail):
  - Login flow: load `/login` → email + password validation → submit → `/dashboard` happy path
  - Login error state: wrong password → server-error banner shows
  - Login Google OAuth: click → redirect → `/auth/callback` → `/dashboard`
  - Login forgot-password link → `/forgot-password`
  - Login "Sign up for free" link → `/register`
  - Register all 7 steps end-to-end: account creation → OTP (or skip via `?google=1`) → body metrics → fitness goal → activity level → summary → `/dashboard`
  - Register validation errors trigger correctly across every step (FieldError component used everywhere)
  - Imperial/metric unit toggle works
  - Country picker autocomplete works
  - BMI gauge renders correctly
- **Deltas vs. plan:**
  - **Header kept on Login.** Spec's `LoginScreen` has no Header — it uses a centered logo + gradient wordmark + eyebrow as page-level chrome. The live app's Header is consistent across every route (landing, auth, authenticated). Removing it from Login alone would create nav inconsistency. The decorative spec elements (centered logo, gradient wordmark) are skipped to avoid duplicating Header's left-aligned wordmark. Header consistency wins.
  - **Apple OAuth button skipped.** Spec shows a 2-column Google + Apple grid; the app currently only has Google OAuth wired. Implementing Apple OAuth is a separate feature, not a reskin. Single Google button stretched to full width.
  - **Register reskin scope: deeper pass after user pushback.** Initial commit shipped only the FieldError shared-component swap; user requested a deeper pass before merge. Second commit on the same branch added the progress-bar redesign + the comprehensive 46-instance MaterialIcon migration. Step-internal special-purpose layouts (BMI gauge, OTP input, country picker autocomplete, segmented controls) preserved verbatim — they're tightly bound to validation/Supabase logic and the existing visual is brand-aligned. Submit buttons preserved as raw `<button>` elements (each has unique conditional loading-state JSX; the icons inside them now use MaterialIcon). The full structural per-step reskin (replacing each step's container layout, restructuring the BMI gauge, etc.) remains best paired with the already-in-backlog Register refactor ticket which would extract each step into its own component.
- **Visual + functional QA:** PASS. User reviewed both the original commit and the deeper Register pass on the design/04b-auth preview, approved.
- **PR:** [#15](https://github.com/healtho-app/healtho/pull/15), merged 2026-05-01 via `gh pr merge --merge`. Two commits: original (`26785ed` — Login full reskin + Register FieldError swap) plus deeper pass (`6c03277` — 46 raw spans → MaterialIcon + 4-segment progress bar redesign).
- **Merge SHA into feature branch:** `8a654f06dcf71bde59f4fa131ee1894b436a72c4`.
- **Sub-branch closed at:** `6c03277`.
- **Six routes reskinned:** Landing (already same-spec), Login, Register, Dashboard, Header, CelebrationOverlay.

### Phase 4c — Profile reskin + Pickup E (raw-span migration)

- **Date:** 2026-05-01
- **Sub-branch:** `design/04c-profile` cut from `feature/design-system@8a654f0`.
- **Phase 4c commit:** `feat(app): Phase 4c — Profile reskin + Pickup E migration` (SHA appended below post-push).
- **Files modified:**
  - `apps/web/src/pages/Profile.jsx` (1,199 lines).
  - `apps/web/src/components/ProfileLoadError.jsx` (173 lines) — Pickup E.
  - `apps/web/src/components/ProtectedRoute.jsx` (76 lines) — Pickup E.
- **Profile.jsx changes:**
  - Added `import { Button, MaterialIcon } from '@healtho/ui'` and `Link` from react-router-dom.
  - **All 33 raw `<span class="material-symbols-outlined">` instances → `MaterialIcon` primitive.** Includes form-label icons (wc, calendar_today, height, monitor_weight, location_on, phone, directions_run), action icons (edit, close, delete, save, photo_camera, auto_awesome, shuffle), state icons (error, warning, check_circle, refresh, calculate, bolt, local_fire_department), the dynamic stat-grid icon (`name={s.icon}` template), and the conditional check_circle on activity-level radio rows (template-literal classNames preserved).
  - **"Go to my Dashboard" CTA** at the bottom converted from raw `<a href="/dashboard">` to `Button variant="primary" size="lg" as={Link} to="/dashboard"`. **Bonus fix beyond visual reskin**: the prior `<a>` caused a full page reload; now React Router navigates client-side. Behavior is strictly better.
- **ProfileLoadError.jsx changes (Pickup E):**
  - Added `import { MaterialIcon } from '@healtho/ui'`.
  - All 5 raw spans → `MaterialIcon`: progress_activity (retrying spinner), refresh, arrow_forward (link variant), and the dynamic `name={msg.icon}` for the error-type icon (used in all three variants: banner, fullpage, card). The `MESSAGES` map's icon names (cloud_off, lock, account_circle_off, error) are now passed as props to MaterialIcon — same XSS-safe text-content pattern.
- **ProtectedRoute.jsx changes (Pickup E):**
  - Added `import { MaterialIcon } from '@healtho/ui'`.
  - 1 raw span → `MaterialIcon` (progress_activity loading spinner during session check).
- **Behavior preservation (verified line-by-line):**
  - Profile: every state hook unchanged (`profile`, `loading`, `editing`, `draft`, `errors`, `saving`, `saved`, `countrySearch`, `countryOpen`, `countryIdx`, `uploading`, `avatarError`, `pickerOpen`, `pickerSeeds`).
  - All Supabase calls verbatim: `auth.getSession`, `from('profiles').select`, `from('profiles').update`, `storage.from('avatars').upload/remove/list/getPublicUrl`.
  - All form handlers (`setDraftField`, `setDraftPositiveNum`, `blockNegativeKeys`, `toggleUnitSystem`, `startEdit`, `cancelEdit`, `saveEdit`) verbatim.
  - Avatar flow: `handleAvatarUpload`, `handleAvatarRemove`, `handleDicebearSelect`, `openPicker`, `shufflePicker` — all verbatim. `resizeImageToBlob`, `svgToPngBlob`, `dylanDataUri`, `dylanSvg`, `randomSeed` helpers untouched. EXIF stripping, PNG conversion via canvas, 512×512 JPEG resize all preserved.
  - Country picker autocomplete: typeahead, keyboard nav (ArrowDown / ArrowUp / Enter / Escape), outside-click closes, US + India pinned at top — all verbatim.
  - Imperial/metric unit toggle live conversion (cm ↔ ft+in, kg ↔ lb) verbatim.
  - BMI / TDEE calculation helpers (`calcBMI`, `calcCalories`, `getBmiInfo`, `calculateBMI`, `totalInchesFromFtIn`) verbatim.
  - `validate`, `validatePhone` verbatim.
  - ProfileLoadError: `MESSAGES` map verbatim; `actionButton` switching logic verbatim; all three variants (banner, fullpage, card) render with identical structure.
  - ProtectedRoute: `onAuthStateChange` + `getSession` 500ms-fallback strategy verbatim. `authResolved` race-prevention flag verbatim. `Navigate to="/login"` redirect verbatim.
- **Primitives consumed:** `Button` (1 usage in Profile — the dashboard CTA), `MaterialIcon` (33 in Profile + 5 in ProfileLoadError + 1 in ProtectedRoute = 39 total).
- **Build:** `pnpm build` green in 3.3 s.
- **Security gates:** `pnpm audit` clean, zero new deps, hardened secret-scan to be verified pre-push, no XSS sinks (zero `dangerouslySetInnerHTML` / `eval` / inline event-handler strings introduced). The `MaterialIcon` primitive continues to receive icon names as JSX text-children — never via innerHTML. `vercel.json` not touched, Supabase auth flow not touched, `.env` not touched.
- **Smoke-test scope:**
  - `/profile` logged in: page loads, avatar displays correctly (image OR initials fallback), Header renders with "Dashboard" right-link
  - View mode: 5-card stat grid (Gender, Age, BMI, Height, Weight), Daily Calorie Goal card, Activity Level card all render with new MaterialIcon glyphs
  - Edit profile button → enters edit mode
  - Edit form: gender selector, age input, height (metric/imperial), weight, BMI live preview, activity level picker, country autocomplete, phone input — all interactions still work
  - Validation errors trigger correctly with new MaterialIcon error glyph
  - Save changes → Supabase upsert succeeds, view mode renders updated values, "Profile updated successfully!" green banner with check_circle icon
  - Save error → red banner with warning icon
  - Cancel button exits edit mode
  - Avatar upload: photo_camera button → file picker → image resizes/uploads/displays
  - Avatar generate: auto_awesome button → DiceBear picker grid opens, 8 seed thumbnails render, select one or shuffle
  - Avatar remove: delete button (only when avatar present) → clears avatar
  - Country autocomplete: typeahead, keyboard nav, outside-click closes
  - Imperial/metric toggle: numbers convert correctly between systems
  - **"Go to my Dashboard" CTA** (bottom): clicking navigates to `/dashboard` **without a full page reload** (React Router) — this is a behavioral improvement beyond the visual reskin
  - ProfileLoadError on Dashboard: trigger by simulating network/auth/notfound errors (or just observe the existing variants render correctly)
  - ProtectedRoute loading spinner: visible briefly on route entry while session checks
  - Mobile viewport (390 px): no overflow
  - Console clean apart from the known vercel.live preview-toolbar block
- **Deltas vs. plan:**
  - **"Go to my Dashboard" CTA fix is a small behavioral improvement** (full page reload → SPA navigation), not just a visual reskin. The plan said "behavioral preservation paramount" but this is a fix that makes navigation strictly better — no user-facing functionality removed. Documented in case user wants to revert; the prior `<a href>` is still functionally equivalent.
  - **Step-internal Profile edit-mode form layouts NOT restructured.** Country picker autocomplete, BMI live preview, gender selector, activity-level picker all kept their existing structures with just icon swaps. Same reasoning as Register: tightly bound to form state machines, restructuring risks regressions for marginal visual gain.
  - **Avatar section visuals NOT restructured.** The current `border-2 border-primary/40` solid border could become a brand-gradient ring per the spec, but the avatar upload/picker/dicebear flows are interconnected; a visual restructure risks breaking the camera-button position or the dicebear picker layout. Phase 6 polish candidate if visual upgrade is desired.
- **Pickup E officially CLOSED** — `apps/web/src/components/{ProtectedRoute,ProfileLoadError}.jsx` raw spans migrated to MaterialIcon. Both files now go through the primitive's text-content XSS guarantee.
- **Visual + functional QA:** PASS. User reviewed the design/04c-profile preview, approved.
- **PR:** [#16](https://github.com/healtho-app/healtho/pull/16), merged 2026-05-01 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `caf0c394d5ef8cc35b4a64c7a9a308769a9b3edb`.
- **Sub-branch closed at:** `377b3ed`.
- **Pickup E officially CLOSED.**

### Phase 4d — LogFoodModal reskin (closes Phase 4 page-level series)

- **Date:** 2026-05-02 (continuing from work begun 2026-05-01)
- **Sub-branch:** `design/04d-logfood` cut from `feature/design-system@caf0c39`. No overnight activity on main; sync gate #2 not needed.
- **Phase 4d commit:** `feat(app): Phase 4d — LogFoodModal reskin (closes Phase 4)` (SHA appended below post-push).
- **File modified:** `apps/web/src/components/LogFoodModal.jsx` (1,019 lines).
- **The biggest-risk reskin in the migration.** LogFoodModal is the most-used modal in the app — every food log goes through it. It hosts USDA food search, custom-food creation, edit-mode entry hydration, drink logging, and the save flow. The mounting parent (Dashboard) consumes `unitCalories/Protein/Carbs/Fat/Fiber` derivations specifically for edit-mode rehydration (in the `meals[].items[]` array). Per the user's locked-in guardrail: **B1 (the edit-as-INSERT data corruption bug) STAYS OUT of this reskin PR.** Separate ticket; visual reskin only.
- **Changes:**
  - Added `import { MaterialIcon } from '@healtho/ui'`.
  - **`MEAL_TYPES` emojis updated** to match SKILL.md non-negotiable §8 rubric (🌅/☀️/🌙/🍎 → 🍳/🥗/🍽️/🍎). Same change Dashboard's `MEAL_META` adopted in Phase 4a. Database `meal_type` keys (`breakfast`/`lunch`/`dinner`/`snacks`) untouched.
  - **All 16 raw `<span class="material-symbols-outlined">` instances → `MaterialIcon` primitive.** Includes:
    - `event` (date warning when logging into a non-today date)
    - `restart_alt` × 2 (custom-food reset buttons)
    - `info` × 3 (helper hints throughout)
    - `search` (search input leading icon — preserves the absolute positioning via className)
    - `close` (close button)
    - `progress_activity` × 2 (search loading + save loading)
    - `add_circle` × 2 ("Add custom food" inline + Log CTA)
    - `arrow_back` (back from custom-food mode)
    - `bookmark` (saved-foods badge)
    - `warning` (error banner)
    - `check_circle` (Save Changes CTA in edit mode)
- **Behavior preservation (verified line-by-line):**
  - Every state hook unchanged (`open`, `view`, `query`, `results`, `selectedFood`, `quantity`, `unit`, `customMode`, `customForm`, `pinnedField`, `errors`, `saving`, etc.).
  - All Supabase calls verbatim (`food_logs.insert`, `food_logs.update`, `custom_foods.upsert`, recent-logs query).
  - USDA fetch flow verbatim (`searchUSDA`, `usdaNutrient`, debounced query, `USDA_API_KEY` + `USDA_SEARCH_URL` constants).
  - **Edit-mode entry hydration verbatim** — the prop `editEntry` and its handling logic untouched. This is where B1 lives; left exactly as-is per the guardrail.
  - **Save flow verbatim** — both insert-new and update-existing branches preserved exactly. B1 fix ticket separate.
  - Custom-food form (`EMPTY_CUSTOM` const, `calcCalories` helper for the 4/4/9 rule, autoCalc logic, pinned-field overrides) untouched.
  - `MacroCard` internal helper component (different from `apps/web/src/components/MacroCard.jsx` — naming collision noted but not refactored; would be a Phase 6 cleanup).
  - Debounced search `useDebounce` hook untouched.
  - Mounting / unmounting via `open` prop unchanged.
- **Primitives consumed:** `MaterialIcon` (16 usages). `Modal` deliberately NOT used — LogFoodModal is a heavy, multi-view modal with bespoke layouts (search list / custom-food form / detail view) that exceed the Modal primitive's centered-card shape. Wrapping in `Modal` would create an inner-scroll / outer-scroll conflict. Same delta as `CelebrationOverlay` from Phase 3c.
- **Build:** `pnpm build` green in 3.5 s.
- **Security gates:** `pnpm audit` clean, zero new deps, hardened secret-scan to be verified pre-push, no XSS sinks introduced (`MaterialIcon` continues to receive icon names as JSX text-children — never via innerHTML), `vercel.json` not touched, Supabase RLS / auth / `.env` not touched, USDA API key handling unchanged (still read from `import.meta.env.VITE_USDA_API_KEY`).
- **Smoke-test scope (extra QA per user's guardrail — most-used modal in the app):**
  - Open from Dashboard `+ Log food` button (no meal preset)
  - Open from each MealSection's `+` button (meal preset = breakfast/lunch/dinner/snacks)
  - Search USDA: type query → debounced search fires → results render with new MaterialIcon glyphs (search, close)
  - Select a USDA result → detail view shows nutrients, quantity controls work
  - Custom-food mode: click `+ Add custom food` → form renders → fill fields → autoCalc toggles between calculated/manual calories → save adds to `custom_foods` and logs the entry
  - Drink logging: select a drink type, log it, confirm WaterTracker on Dashboard updates accordingly
  - Edit-mode hydration (B1 territory — DO NOT BREAK): from MealSection click pencil on existing entry → modal opens with `editEntry` prefilled → save updates the existing row (the prior INSERT-instead-of-UPDATE bug is B1; keep current behavior, don't try to fix here)
  - Date warning: log into a non-today date via past-date Dashboard view → yellow `event` warning banner appears
  - Save success: modal closes, dashboard refetches logs, macros recalc
  - Save error: red `warning` banner shows
  - Mobile viewport (390 px): no overflow, save button reachable
  - Console clean apart from the known vercel.live preview-toolbar block
- **Deltas vs. plan:**
  - **MEAL_TYPES emoji rubric update** (🌅/☀️/🌙/🍎 → 🍳/🥗/🍽️/🍎). Display-only constant; database keys untouched. Same change Dashboard's MEAL_META got in Phase 4a.
  - **Modal primitive NOT used** to wrap the LogFoodModal overlay — multi-view layouts (search / custom / detail) don't fit Modal's centered-card shape. Matches the same call made in Phase 3c for CelebrationOverlay.
  - **Step-internal layouts NOT restructured** — search results list, USDA detail view, custom-food form, quantity selector all kept their existing structures with just icon swaps. Same reasoning as Register / Profile: tightly bound to state machines + USDA data shape; restructuring risks regressions for marginal visual gain. Phase 6 polish candidate if specific complaints surface.
  - **B1 left intact per guardrail.** The edit-as-INSERT data corruption bug remains in this PR; fixing it in a reskin PR would muddy review and violate the user's "B1 stays out" rule.
  - **Submit buttons preserved as raw `<button>`** — same call as Register's submit-button preservation. Each has unique conditional content (Saving… / Save Changes / Log Food / Log Drink / Log Custom Food). Wrapping in `Button` primitive would change DOM structure across 4-5 distinct text contents with high regression risk. Buttons already use brand-primary background + soft violet shadow.
  - **Internal `MacroCard` helper component** (line ~111 in LogFoodModal.jsx) shares its name with `apps/web/src/components/MacroCard.jsx`. Naming collision is pre-existing; renaming would be a refactor. Phase 6 cleanup candidate.
- **Visual + functional QA:** PASS. User exercised LogFoodModal end-to-end on the preview, including a USDA search that surfaced a 400 (Bread (White) parens-rejection — verified pre-existing API quirk, NOT a Phase 4d regression since the diff didn't touch USDA fetch logic). User merged after the verification.
- **PR:** [#17](https://github.com/healtho-app/healtho/pull/17), merged 2026-05-02 via `gh pr merge --merge`.
- **Merge SHA into feature branch:** `42109ea7d5cc1892f91c211c51df6fe30cbbfbd7`.
- **Sub-branch closed at:** `40d612d`.
- **Phase 4 page-level series ✅ COMPLETE** — Dashboard + Login + Register + Profile + LogFoodModal all reskinned with zero behavioral regressions. **B1 intentionally not bundled per the user's locked-in guardrail** — separate ticket in HLTH backlog. New cleanup candidate surfaced: USDA-API parens-rejection quirk (separate ticket, not in design-system migration scope).

### Phase 5 — Landing polish (standalone)

- **Date:** 2026-05-02
- **Sub-branch:** `design/05-landing` cut from `feature/design-system@42109ea`. No overnight activity on main; sync gate #2 deferred to Phase 6 tomorrow per the master-agent brief (which noted PR #18 — Node 22 LTS bump — is in flight off main and will be absorbed at Phase 6 entry).
- **Phase 5 commit:** `feat(app): Phase 5 — landing polish` (SHA appended below post-push).
- **Pre-work verified before this phase started:** all 9 landing JSX components in `apps/web/src/components/landing/` are byte-identical to the design-system spec at `project/frontend/src/components/landing/` (HeroSection, FeaturesSection, BenefitsSection, PricingSection, Footer, LandingNavbar, BackgroundMedia, DashboardPreview, StatsBar — 0 diff lines each). So the structural reskin Phase 5 was originally framed for is already done.
- **Files modified:**
  - `apps/web/src/components/landing/FeaturesSection.jsx` — 1 raw span → MaterialIcon (the dynamic feature-card icon, `name={icon}`)
  - `apps/web/src/components/landing/LandingNavbar.jsx` — 1 raw span → MaterialIcon (mobile hamburger toggle, `name={menuOpen ? 'close' : 'menu'}`); also added `aria-expanded={menuOpen}` for accessibility
  - `apps/web/src/components/landing/DashboardPreview.jsx` — 1 raw span → MaterialIcon (`local_fire_department` in the streak card)
  - `apps/web/src/components/landing/PricingSection.jsx` — 1 raw span → MaterialIcon (`check_circle` in feature lists, ×3 plans)
  - `apps/web/src/components/landing/BackgroundMedia.jsx` — added `prefers-reduced-motion` autoplay suppression. Uses `window.matchMedia('(prefers-reduced-motion: reduce)')` with a live-tracking listener so OS-level toggles take effect mid-page. Falls through to poster image when reduce is set. SKILL.md non-negotiable §15 honored.
  - `apps/web/src/index.css` — landing animation reduce-motion guards:
    - `.landing-fade-up` duration changed from hardcoded `0.7s` to `var(--dur-reveal)` (tokens.css collapses to 0 ms on `prefers-reduced-motion: reduce`).
    - `.landing-float` (continuous decorative idle animation) wrapped in a `@media (prefers-reduced-motion: reduce) { animation: none; }` rule so it stops entirely on reduce.
    - `.landing-delay-1..4` zero out their delay on reduce so content appears immediately in final state without flicker.
- **Behavior preservation (verified):**
  - All 9 landing components functionally unchanged — same Link routes, same `BackgroundMedia` API, same `useState` mobile-menu toggle, same supabase RPC call in StatsBar, same Footer structure. Only icon swaps, autoplay-on-reduce-motion guard, and CSS animation timing changes.
- **Primitives consumed:** `MaterialIcon` (4 usages across 4 landing files).
- **Build:** `pnpm build` green in 3.85 s.
- **Security gates:** `pnpm audit` clean, zero new deps, hardened secret-scan to be verified pre-push, no XSS sinks introduced (`MaterialIcon` continues to receive icon names as JSX text-children), `vercel.json` not touched, Supabase / `.env` not touched, `package.json` / `.nvmrc` not touched (PR #18 owns the Node bump off main).
- **Token consumption audit (findings flagged for awareness — NOT fixed in this phase per scope):**
  - **Page gutters** across landing components use raw Tailwind classes (`px-6 lg:px-10`, `max-w-7xl mx-auto`) instead of the `var(--page-gutter)` token. The token's `clamp(1rem, 4vw, 3rem)` formula doesn't cleanly substitute for the responsive `px-6 lg:px-10` pattern (which jumps from 24 px to 40 px at the lg breakpoint). The marketing page intentionally uses `max-w-7xl` (1280 px wide) which is wider than the in-app `max-w-[520px]` mobile-shaped container, so the page-gutter token's role is different here. **Conclusion: not a real gap; landing is intentionally a different layout context.** No change recommended.
  - **Typography** uses raw Tailwind utilities (`text-3xl sm:text-4xl font-bold`, `text-xl font-semibold`, `text-xs font-semibold uppercase tracking-[0.2em]`) instead of semantic classes (`.h-display`, `.h1`, `.h2`, `.label`, `.body`, etc.) shipped in tokens.css. The semantic classes use `clamp()` for fluid type, while landing copy uses Tailwind's responsive-prefix pattern with discrete breakpoints. Either approach is valid; landing's responsive-prefix pattern gives more designer control over breakpoint behavior. **Conclusion: stylistic choice, not a regression.** Could migrate in a future structural Phase 5.5 if the design-system shifts to fluid-type-only.
  - **Colors** mostly use Tailwind tokens (`text-white`, `text-primary`, `bg-brand-gradient`, `text-brand-cyan`, `text-brand-pink`, `bg-protein/15`, etc.) — already token-driven. No raw hex values found in landing components. ✅
  - **One observation:** `BenefitsSection.jsx:48` uses `text-white/[0.06]` for the giant decorative number. That's an arbitrary opacity, not a token. Acceptable for a decorative numeric flourish; not flagging.
- **SKILL.md voice rubric audit (findings flagged for awareness — NOT changed in this phase):**
  - Sentence case: ✅ all headlines and CTAs use sentence case ("Build healthy habits", "Start tracking smarter today", "Get Started Free" — Title Case is acceptable for CTAs per the rubric's CTA pattern).
  - Emoji rules: 1 emoji in landing — the 🚀 in the hero badge "Now Available for Web". Per SKILL.md §8 emojis are restricted to meal-types and activity-pickers. **Borderline:** the 🚀 is in a Pop badge, not a headline / CTA / celebration line. Marketing-page badge feels like a third acceptable context but it's not explicitly green-lit by the rubric. **Flagging for awareness, not fixing** — designer / marketing call.
  - Voice (warm, data-first, second person): mostly compliant. "Lose weight with clarity" is data-first ✓. "Build healthy habits" is action-oriented ✓. Hero subheadline "Track calories, monitor nutrition, and achieve your fitness goals with intelligent insights and personalized recommendations" leans more aspirational/SaaS-marketing than data-first. **Acceptable for a marketing hero**; in-app copy follows the rubric more strictly.
  - **Conclusion: voice is compliant enough for landing's marketing context.** No surgical edits needed.
- **Reduce-motion audit results:**
  - **`landing-fade-up`** (entrance fade on hero copy + dashboard preview) — now uses `var(--dur-reveal)` which collapses to 0 ms on reduce. Content appears immediately in final state. ✅
  - **`landing-float`** (subtle bob on the right-side dashboard preview card) — now `animation: none` on reduce. Card sits still. ✅
  - **`landing-delay-1..4`** — zero out on reduce so the staggered entrance happens instantly. ✅
  - **`BackgroundMedia` video autoplay** — suppressed on reduce; poster image renders instead. Live media-query listener tracks runtime toggles. ✅
  - **HeroSection / FeaturesSection / BenefitsSection / StatsBar / PricingSection / Footer / LandingNavbar** — no other animations beyond the four covered above. No scroll-triggered animations on landing currently. ✅
  - **`celebration-enter`, `water-goal-glow`, `ring-animate`** — celebration / dashboard animations, NOT on landing. Already handled by Phase 1 motion tokens.
- **Deltas vs. plan:**
  - **Page-gutter token usage in landing flagged as not-applicable** rather than fixed. Landing's `max-w-7xl + px-6 lg:px-10` pattern is intentionally a different layout context (1280 px content frame for marketing) than the in-app `max-w-[520px]` mobile-shaped container (where `--page-gutter` makes more sense). Documented above; no change recommended.
  - **Typography raw utilities flagged as stylistic, not a regression.** Could migrate in a future structural pass; not in Phase 5 scope.
  - **🚀 emoji in hero badge flagged as borderline rubric compliance.** Not changing — designer / marketing call.
- **Pending:** user visual + functional QA on the design/05-landing preview URL — landing renders cleanly across desktop/tablet/mobile, all 4 migrated icons visible, animations fire normally with reduce-motion OFF, animations collapse to final state with reduce-motion ON (test via macOS System Preferences → Accessibility → Display → Reduce Motion). Then merge. **After 5 lands, only Phase 6 (polish) and Phase 7 (final merge) remain.**
- **Closeout:**
  - **Phase 5 commit SHA:** `5442745` (`feat(app): Phase 5 — landing polish (4 icons + reduce-motion guards)`)
  - **PR #19** merged into `feature/design-system` at `b1e8800` ("Merge pull request #19 from healtho-app/design/05-landing"). User QA passed — landing renders correctly across viewports, reduce-motion guards behave as expected.
  - **Audit-of-the-audit (correction surfaced during Phase 6 prep):** the Phase 5 closeout note above stated `celebration-enter`, `water-goal-glow`, and `ring-animate` were "Already handled by Phase 1 motion tokens." That claim is inaccurate — those three classes use **hardcoded** durations (`0.4s`, `2s ... infinite`, `1.4s`) and do NOT consume `var(--dur-*)` tokens. Phase 1's tokens.css `prefers-reduced-motion` block only zeroes the `--dur-*` custom properties; it cannot touch hardcoded animation shorthands. Phase 6 closes this gap (see Phase 6 entry below).

### Phase 6 — Polish (auth-tail icons + CSP cleanup + reduce-motion audit + validation sweep)

- **Date:** 2026-04-30 (today)
- **Sub-branch:** `design/06-polish` cut from `feature/design-system@b1e8800`.
- **Sync gate #2:** **skipped** — `origin/main` still at `efafab8` (PR #18 — Node 22 LTS bump — not yet merged off main per master-agent brief). Per dispatch instruction: "Sync gate #2 will run separately before Phase 7 dispatch." `git log origin/main` confirms no new commits since the last sync gate snapshot.

#### Bucket 1 — Auth-tail / utility icon migration (raw `<span class="material-symbols-outlined">` → `<MaterialIcon />`)

Six pages migrated. Each gained an `import { MaterialIcon } from '@healtho/ui'` and had every raw icon span swapped 1-for-1. No prop / callback / Supabase call changes. Behavioral preservation verified by diff inspection.

- `apps/web/src/pages/ForgotPassword.jsx` — 6 spans → MaterialIcon (`error`, `mark_email_read`, `arrow_back`, `mail`, `progress_activity` ×2, `arrow_forward`)
- `apps/web/src/pages/ResetPassword.jsx` — 11 spans → MaterialIcon (`error`, `check_circle`, `link_off`, `send`, `progress_activity` (verify), `lock`, dynamic `visibility`/`visibility_off`, `lock_reset`, `warning`, `progress_activity` (button), `arrow_forward`)
- `apps/web/src/pages/AuthCallback.jsx` — 2 spans → MaterialIcon (`error`, `progress_activity` with `animate-spin`)
- `apps/web/src/pages/NotFound.jsx` — 5 spans → MaterialIcon (`search_off`, `home`, `login`, dynamic `{icon}` in quick-links, `arrow_forward`)
- `apps/web/src/pages/Terms.jsx` — 2 spans → MaterialIcon (`gavel`, `arrow_back`)
- `apps/web/src/pages/Privacy.jsx` — 3 spans → MaterialIcon (`shield`, dynamic `{s.icon}` in section list, `arrow_back`)

After this bucket, **zero** raw `material-symbols-outlined` spans remain across `apps/web/src/`.

#### Bucket 2 — `vercel.json` CSP cleanup (Pickup D, pre-approved)

Locked-in change per the master-agent brief — no other CSP directives touched:

- `style-src`: removed `https://fonts.googleapis.com` (kept `https://fonts.googleapis.com/css2` since the import path uses the full URL with the `/css2` segment)
- `font-src`: removed `https://fonts.gstatic.com` (we now self-host all fonts — Lexend, DM Mono, Material Symbols Outlined — via `packages/ui/fonts/` so the gstatic CDN allow-list is dead weight)
- All other directives byte-identical: `default-src`, `script-src`, `worker-src`, `connect-src`, `img-src`, `frame-ancestors`

Reasoning: closing the door on third-party font CDN connections matches the self-hosted-font reality from Phase 1 and Phase 3d. CSP attack surface shrinks. The Network tab on a freshly-loaded preview page should show **zero** requests to `fonts.googleapis.com` or `fonts.gstatic.com` — if any appear, that's a regression to investigate.

(First-attempt over-broad edit was self-caught and reverted before commit; final value matches the brief precisely.)

#### Bucket 3 — `prefers-reduced-motion` full-app audit

Audit found **three** custom CSS animations in `apps/web/src/index.css` whose `animation` shorthand uses hardcoded durations (`0.4s`, `1.4s`, `2s ... infinite`) and therefore are NOT covered by tokens.css's `--dur-*` collapse rule. Each is now wrapped in a per-class `@media (prefers-reduced-motion: reduce)` override:

- `.ring-animate` — `animation: none` + freezes `stroke-dashoffset` at the end-of-animation value (101.8) so the calorie ring renders in its filled final state without the 1.4 s sweep.
- `.celebration-enter` — `animation: none` + `opacity: 1; transform: none;` so the celebration card appears in its final position immediately, no fade-and-scale.
- `.water-goal-glow` — `animation: none`. **Critical:** this one is an INFINITE loop (`waterGlow 2s ease-in-out infinite`) — the most clearly vestibular-sensitive animation in the codebase. Static cyan border + gradient still convey goal-met state without the pulsing glow.

`apps/web/src/components/LogFoodModal.jsx:588` — full-screen bottom-sheet slide-up uses `transition-transform duration-300` plus `${open ? 'translate-y-0' : 'translate-y-full'}`. That's a full-viewport-height translate — the largest single motion in the app outside the celebration overlay. Added `motion-reduce:transition-none` so the modal snaps into place instead of sliding when reduce-motion is on.

Token-driven animations verified safe (no change needed):
- `CalorieRing.jsx:157` reward state — `animation: 'rewardPop var(--dur-reward) var(--ease-spring) both'` ✅
- `CelebrationOverlay.jsx:166,177,203` — `rewardBurst`, `rewardPop`, `rewardShimmer` all reference `var(--dur-reward)` ✅
- `index.css` `.landing-fade-up` — `var(--dur-reveal)` (Phase 5) ✅
- `index.css` `.landing-float` — `animation: none` reduce-motion override (Phase 5) ✅
- `BackgroundMedia` video — autoplay suppressed with poster fallback (Phase 5) ✅

Tailwind `animate-spin` / `animate-pulse` (loading spinners + skeleton) intentionally **not** disabled — they convey active loading state, removing them would make UI appear frozen. Per WCAG 2.3.3 these are functional indicators, not decorative motion.

Tailwind `transition-colors` / `transition-opacity` / short hover transforms (`hover:-translate-y-0.5` ~2 px, `duration-200`) intentionally **not** disabled — these are sub-vestibular-threshold cosmetic state changes, not large translates / parallax / infinite loops.

#### Bucket 4 — Final validation sweep

- **`pnpm turbo run build --filter=healtho-web`:** ✅ green in 3.50 s. 511 modules transformed. Bundle warning about 598 kB main chunk is pre-existing (not introduced by Phase 6).
- **`pnpm audit --prod`:** ✅ "No known vulnerabilities found"
- **Hardened secret-scan** (credential-shape pattern across the repo, excluding node_modules / dist / .git / .turbo / build / .next / .vercel): ✅ no matches
- **`vercel.json` final CSP value:** verified byte-precise match to brief
- **No new dependencies:** ✅ no `package.json` changes in Phase 6
- **Supabase / `.env`:** ✅ untouched
- **`packages/ui` source:** ✅ untouched (only `apps/web/src/` modified for the icon swaps + index.css guards)
- **Lighthouse + console-clean smoke + Network-tab third-party-font check:** to be performed by user on the design/06-polish Vercel preview URL.

#### Working-tree summary at PR-prep time

9 modified files: `apps/web/src/components/LogFoodModal.jsx`, `apps/web/src/index.css`, `apps/web/src/pages/AuthCallback.jsx`, `apps/web/src/pages/ForgotPassword.jsx`, `apps/web/src/pages/NotFound.jsx`, `apps/web/src/pages/Privacy.jsx`, `apps/web/src/pages/ResetPassword.jsx`, `apps/web/src/pages/Terms.jsx`, `vercel.json`.

#### Closeout

- **Phase 6 commit SHA:** `7f4ecf8` (`feat(app): Phase 6 — polish (auth-tail icons + CSP cleanup + reduce-motion guards)`)
- **PR #20** merged into `feature/design-system` at `e3ae6d5` ("Merge pull request #20 from healtho-app/design/06-polish") on 2026-05-03 07:39 UTC. User QA passed on the design/06-polish Vercel preview — reduce-motion guards verified, no Network-tab requests to third-party font CDNs, all 11 routes console-clean.

### Sync gate #2 — main → feature/design-system (Phase 7 entry)

- **Date:** 2026-05-05
- **Trigger:** PR #18 (Node 22 LTS bump) merged on main at `0f49beb` on 2026-05-03 07:48 UTC. Main subsequently moved to `f206b47` via the 2026-05-04 weekly content-brief auto-commit (docs-only, automation pipeline).
- **Pre-sync state:** `feature/design-system` @ `e3ae6d5` (Phase 6 merge). Cut-from main was `efafab8` (pre-baseline, since that's what the original `pre-design-system` tag captured).
- **Sync command:**
  ```
  git checkout feature/design-system
  git pull --ff-only
  git merge origin/main --no-ff -m "chore(sync): absorb main into feature/design-system (sync gate #2)"
  git push origin feature/design-system
  ```
- **Post-sync `feature/design-system` HEAD:** `31c9cc7`.
- **Files touched by the merge** (all from main, zero overlap with design-system work):
  - `.nvmrc`: `20` → `22`
  - `package.json`: `"engines.node": "20.x"` → `"22.x"`
  - `automation/output/*` — content-brief auto-pipeline outputs (docs/marketing only; no code path touches these)
- **Verification post-sync:**
  - `cat .nvmrc` → `22` ✅
  - `package.json` `engines.node` → `"22.x"` ✅
  - `pnpm install --frozen-lockfile` ✅ no lockfile changes needed
  - `pnpm turbo run build --filter=healtho-web` ✅ green in 5.53 s

### Belt-and-suspenders rollback anchor

Before opening Phase 7's PR to main, cut a second tag at the current main HEAD as an additional safety net (atop the existing `pre-design-system` @ `b9f1ed6`):

- **Tag:** `main-before-design-merge`
- **Points to:** `f206b47` (current `main` HEAD on 2026-05-05, immediately before PR #21 lands)
- **Pushed to origin:** ✅ `git push origin main-before-design-merge` succeeded
- **Both rollback tags verified on origin:**
  ```
  $ git ls-remote --tags origin | grep -E 'pre-design-system|main-before-design-merge'
  f206b47…  refs/tags/main-before-design-merge
  b9f1ed6…  refs/tags/pre-design-system
  ```

### Phase 7 — Final PR feature/design-system → main (only PR that touches production)

- **Date:** 2026-05-05
- **Hard rule:** the execution agent does NOT merge this PR. Ayush merges after his own QA pass on the production-bound preview.

#### Pre-merge sweep results

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ no lockfile drift |
| `pnpm turbo run build --filter=healtho-web` | ✅ green in 5.53 s, 511 modules transformed |
| `pnpm audit --prod` | ✅ "No known vulnerabilities found" |
| Cumulative `git diff` secret-scan vs `pre-design-system` baseline | ✅ no matches (credential-shape regex) |
| `git diff pre-design-system feature/design-system -- vercel.json` | ✅ only allowed deltas (see below) |
| `git diff pre-design-system feature/design-system -- '*supabase*'` | ✅ empty (zero diff) |
| `git diff pre-design-system feature/design-system -- '.env*'` | ✅ empty (zero diff) |
| `apps/` + `packages/` references to `fonts.googleapis.com` | ✅ zero (runtime same-origin) |
| `apps/` + `packages/` references to `fonts.gstatic.com` | ✅ zero (runtime same-origin) |
| Lighthouse comparison preview vs prod main | **deferred to Ayush's QA** (script can't run on Vercel-auth preview from this env) |
| Console-clean smoke (11 routes) | **deferred to Ayush's QA** |
| DevTools Network-tab third-party font CDN check | **deferred to Ayush's QA** |
| Reduce-motion sweep (11 routes, OS toggle ON) | **deferred to Ayush's QA** |

#### `vercel.json` delta vs `pre-design-system` baseline (only allowed changes)

```diff
-        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://fonts.googleapis.com/css2; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.nal.usda.gov; img-src 'self' data: https:; frame-ancestors 'none';" }
+        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com/css2; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.nal.usda.gov; img-src 'self' data: https:; frame-ancestors 'none';" }
```

Two allowed deltas:
1. **Add `worker-src 'self' blob:;`** — from PR #7 ("Fix: add worker-src to CSP for avatar Web Worker"), which had been merged to main at `efafab8` on 2026-04-30 but which `pre-design-system` (cut at `b9f1ed6`) predates.
2. **Pickup D removals** — Phase 6 dropped the now-unused `https://fonts.googleapis.com` from style-src (the bare-domain entry; the more specific `https://fonts.googleapis.com/css2` URL is kept), and dropped `https://fonts.gstatic.com` from font-src.

No other CSP directives changed.

#### Same-origin enforcement notes

- Runtime app code (`apps/` + `packages/`) has zero references to `fonts.googleapis.com` or `fonts.gstatic.com`. All fonts (Lexend × 10 weights, DM Mono × 6 cuts, Material Symbols Outlined variable) are bundled via Vite from `packages/ui/fonts/` and served from the deployment's own origin under `/assets/`.
- The `vercel.json` CSP entry `https://fonts.googleapis.com/css2` (style-src) is now a **dead permission** — no app code references it. **Flagged as post-migration cleanup candidate**, not removed in this PR (would extend scope).
- Reference matches that surfaced in repo grep but are NOT runtime concerns:
  - `docs/*.md` — historical prose describing prior CSP states (audit trail). Not executable, not deployed.
  - `ui-demos/*.html` — original Claude Design HTML mocks. Sit at repo root in `ui-demos/`; never built into the deployment (Vercel's `outputDirectory` is `apps/web/dist`). Reference-only files.

#### Cumulative diff stats

```
$ git diff main...feature/design-system --shortstat
 61 files changed, 3752 insertions(+), 535 deletions(-)
$ git rev-list --count main..feature/design-system
 39
```

(39 commits ahead of main: Phase 0 docs + 13 phase-feature commits + 13 phase-merge commits + 4 docs/log commits + 7 pre/post-phase doc commits + 1 sync-gate-#1 doc commit + sync-gate-#2 merge.)

#### Phase 7 PR — pending opening

PR #21 to be opened directly after this commit lands. URL will be appended in the post-merge closeout commit (per the deferred-closeout pattern).

---

## MIGRATION COMPLETE — PR #21 closeout

- **PR:** [#21](https://github.com/healtho-app/healtho/pull/21) — `feat(design): cumulative design-system migration → main`
- **Merge SHA on main:** `7228aca3b3b5e6f26abba58f8bf68fdc5059e7fd`
- **Merge timestamp:** `2026-05-06T06:20:19Z`
- **Production URL:** https://healtho-kohl.vercel.app
- **Production deployment fingerprint:** Vite bundle hashes `index-DXIPnBbY.js` + `index-BUgolVrc.css` served from `/assets/` on the production origin. (Stable Vercel `dpl_*` deployment ID is not exposed on production HTML — no preview-toolbar injection in prod — and capturing it requires authenticated dashboard access; left for Ayush to record into the project's deployment ledger if desired.)

### Production smoke-test results

Tested directly against `https://healtho-kohl.vercel.app` from the closeout agent (read-only HTTP layer). Authenticated flows + DevTools-level checks were not in the static agent's reach and were handed off to Ayush.

#### HTTP-layer (verified by closeout agent — PASS)

| Route | Status | Notes |
|---|---|---|
| `/` | 200 | Same-origin SPA shell, identical bundle hashes |
| `/login` | 200 | SPA route resolves client-side |
| `/register` | 200 | SPA route resolves client-side |
| `/dashboard` | 200 | SPA shell — auth gate enforced client-side via `ProtectedRoute` |
| `/profile` | 200 | SPA route resolves client-side |
| `/forgot-password` | 200 | SPA route resolves client-side |
| `/reset-password` | 200 | SPA route resolves client-side |
| `/404-doesnotexist` (any bad path) | 200 | SPA shell; `NotFound` rendered client-side via `Routes` fallback |
| `/terms` | 200 | SPA route resolves client-side |
| `/privacy` | 200 | SPA route resolves client-side |
| `/_design-preview` | 200 | SPA shell; `isDesignPreviewAllowed()` returns `false` on `healtho-kohl.vercel.app` and falls through to `NotFound` (client-side gate verified by reading `apps/web/src/App.jsx`) |

CSP / security headers identical across all routes:

- `Content-Security-Policy` — Phase 6 hardened CSP (worker-src `'self' blob:`; style-src no longer includes bare `fonts.googleapis.com`; font-src `'self'` only; `fonts.googleapis.com/css2` retained as a path-restricted entry, dead permission — flagged as separate cleanup ticket)
- `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection` — all present on every route

Self-hosted assets verified 200 from the production origin:

- `/assets/Lexend-Regular-peUU6jwM.ttf` ✅
- `/assets/DMMono-Regular-CHcedrof.ttf` ✅
- `/assets/MaterialSymbolsOutlined-Variable-OqZILbjW.woff2` ✅
- `/assets/index-DXIPnBbY.js` (main JS bundle) ✅
- `/assets/index-BUgolVrc.css` (main CSS bundle) ✅
- All 16 self-hosted font URLs are referenced by the deployed CSS bundle (same Vite hashes as preview build).

Production HTML inspection: zero `fonts.googleapis.com` / `fonts.gstatic.com` `<link>` tags, zero `<link rel="preconnect">` to Google CDNs, zero `vercel.live` toolbar script (preview-only injection — confirmed absent on production). Production CSS bundle inspection: zero references to `fonts.googleapis.com` or `fonts.gstatic.com`.

#### Browser-layer (handed off to Ayush — must verify before declaring done)

Static agent cannot reach these. Ayush's responsibility on the final pass:

| Check | What to verify |
|---|---|
| Landing render | Hero loads, no FOUC, fonts swap to Lexend cleanly, CalorieRing demo + landing animations OK |
| `/login`, `/register` | Form renders, 4-segment progress bar fits at 320 px, submit reachable, FieldError glyphs render |
| `/dashboard` (authenticated) | Sign in with test account → ring + macros + meals render, food log shows |
| `/profile` (authenticated) | Every field renders; edit + save flows; raw-span migration (Pickup E) clean |
| LogFoodModal end-to-end | Open from dashboard → search USDA → save a food → modal closes → macros recalc |
| Sign-out | `/dashboard` → sign out → redirect to `/login` |
| DevTools Network (landing + dashboard) | Zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`; all fonts from `/assets/` same-origin |
| DevTools Console (landing + dashboard) | Zero errors, zero CSP violations (no preview-toolbar block on production), zero deprecation warnings |
| `/_design-preview` on production host | Confirm `NotFound` renders (client-side gate behaves as designed) |

If anything fails: do **not** patch in place. Layer 1 rollback is Vercel "Promote previous deployment" — fastest path back to `main-before-design-merge` @ `f206b47`.

### Migration timeline

- **Phase 0 first action:** 2026-04-29 (commit `30b9b98` — `docs: bootstrap design system execution plan`)
- **PR #21 merge to main:** 2026-05-06 (merge commit `7228aca`)
- **Calendar span:** Apr 29 → May 6 = 8 calendar days inclusive (7-day gap)
- **Working days:** Apr 29 (Wed), 30 (Thu), May 1 (Fri), May 4 (Mon), May 5 (Tue), May 6 (Wed) = 6 working days. Phase 4d work also touched Sat May 2 (LogFoodModal continuation).

### Total scope shipped

- **14 sub-PRs** merged into `feature/design-system` over the migration window: PR #8 (primitives), #9 (3a read-only), #10 (3.5 Card radius), #11 (3b Header), #12 (3c CelebrationOverlay), #13 (3d self-host MS), #14 (4a Dashboard), #15 (4b Login + Register), #16 (4c Profile), #17 (4d LogFoodModal), #19 (Phase 5 landing), #20 (Phase 6 polish), plus `feature/design-system` direct merge for Phase 1 (no PR — `gh` not yet installed) and the cumulative shipping PR #21.
- **2 sync gates** absorbing main into `feature/design-system`:
  - **Sync gate #1** (2026-04-30) — picked up PR #7 (`worker-src 'self' blob:` CSP hotfix at `efafab8`); merge commit `4057ae4`.
  - **Sync gate #2** (2026-05-05) — picked up PR #18 + weekly content brief; merge commit `31c9cc7`.
- **2 infra hotfixes** during the migration window:
  - **PR #7** — CSP `worker-src 'self' blob:` for the avatar Web Worker (parallel hotfix; not introduced by this migration).
  - **PR #18** — Node `20 → 22` LTS bump aligning `.nvmrc` + `package.json` engines. Vercel project-level `nodeVersion` (currently `24.x`) update remains a dashboard-only follow-up for Ayush.

### Pickups closed in this migration

- **Pickup A** — Material Symbols Outlined now self-hosted (Phase 3d, PR #13). Variable woff2 + LICENSE.txt sit at `packages/ui/fonts/`; SHA-256 baselines logged.
- **Pickup B** — Node 22 LTS adopted at the repo level (PR #18). Cosmetic Vercel-dashboard update (`nodeVersion: 24.x → 22.x`) deferred to Ayush.
- **Pickup D** — CSP cleaned up in Phase 6 (Pickup D removals): bare `https://fonts.googleapis.com` removed from `style-src`; `https://fonts.gstatic.com` removed from `font-src`.
- **Pickup E** — All raw `<span class="material-symbols-outlined">` instances across `apps/web/src/` migrated to the `MaterialIcon` primitive (closed across Phases 4c + 6). Final post-Phase-6 grep returns zero hits in app source.

### Pickups deferred to HLTH backlog

Tracked separately; intentionally not bundled into this migration:

- **Pickup F** — `Register.jsx` step-internal layout refactor (the locked-in guardrail; reskin only, no structural changes).
- **Card primitive** — add `overflow="visible"` prop for surfaces that need a non-clipping radius wrapper.
- **USDA API parens-rejection quirk** — pre-existing 400 on certain food-name queries (e.g. `Bread (White)`); surfaced during Phase 4d QA, confirmed pre-existing.
- **B1** — LogFoodModal edit-as-INSERT data-corruption bug. Intentionally **not** fixed in the reskin per the user's locked-in guardrail; separate ticket.
- **LogFoodModal `MacroCard` naming collision** — internal helper component shares a name with `apps/web/src/components/MacroCard.jsx`. Phase 6 cleanup candidate; deferred.
- **`fonts.googleapis.com/css2` CSP entry** — currently retained in `style-src` as a path-restricted permission. Now a dead permission (no app code references it post-self-hosting). Tighten in a follow-up CSP polish.

### Rollback anchors (in place, NOT deleted)

| Anchor | SHA | Retention |
|---|---|---|
| `pre-design-system` (tag) | `b9f1ed6` | **Permanent** — pre-migration baseline |
| `main-before-design-merge` (tag) | `f206b47` | 1 week — last `main` HEAD before PR #21 |
| `feature/design-system` (branch) | `4dc760b` | 1 week — full cumulative branch (recoverable cherry-pick source) |
| `design/0X-*` sub-branches × 13 | — | 1 week — per-phase recovery anchors |

Layer 1 rollback (Vercel "Promote previous deployment"): targets the deployment built from `f206b47`. Fastest path. Layer 2: `git revert -m 1 7228aca` on `main`. Layer 3: cherry-pick from `feature/design-system` for partial rollback. Layer 4: `git reset --hard pre-design-system` (nuclear; permanent baseline always available).

### Branch retention + cleanup

- `feature/design-system` and all 13 `design/0X-*` sub-branches remain on origin for 1 week as belt-and-suspenders.
- `main-before-design-merge` tag held for 1 week alongside.
- **Cleanup ticket:** scheduled for **2026-05-13**. At that point: delete the 14 working branches, optionally drop the `main-before-design-merge` tag (the `pre-design-system` tag stays permanent).

### Out of scope (Ayush handles, not the agent)

- Vercel project `nodeVersion: 24.x → 22.x` dashboard update (Pickup B cosmetic finish).
- Sub-branch deletion on 2026-05-13 (cleanup ticket above).
- Internal notification: Ishaan + any other stakeholders — migration-complete posting.

### Migration formally complete

PR #21 merged at `7228aca` on 2026-05-06T06:20:19Z. Production smoke test passed at the HTTP layer. Browser-layer verification handed to Ayush. Rollback anchors intact. All in-scope pickups (A, B repo-side, D, E) closed. All deferred pickups tracked in HLTH backlog. Migration window: 2026-04-29 → 2026-05-06 (8 calendar days, 14 sub-PRs, 2 sync gates, 2 infra hotfixes).

