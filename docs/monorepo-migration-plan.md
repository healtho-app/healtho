# Healtho Monorepo Migration Plan

**Status:** Planned, not executed
**Created:** 2026-04-23
**Last updated:** 2026-04-24
**Authors:** Ayush (founder) + Claude agent (planning session)
**Purpose:** Restructure the current single-repo web app into a monorepo so the future React Native mobile app (Phase 4) can share business logic, types, and design tokens with the web app — without runtime breakage or wasted rework.

---

## ⚠️ READ THIS FIRST — context for the agent executing this plan

**Ayush's git history with this repo:**
- Solo developer pushing directly to `main` for every change
- **Has never worked on a feature branch before this migration**
- Has never opened a GitHub Pull Request on this repo
- Has never used Vercel preview deploys for verification
- Every previous change (Sprint 2 tickets, bug fixes, features) went straight to production via `git push origin main`

**What this means for you as the executing agent:**

1. **Do not assume branch workflow familiarity.** Before any branch operation, tell Ayush what you're about to do and why. Before pushing to a feature branch, explicitly say: *"This push will NOT affect production. It only updates the feature branch and triggers a Vercel preview build at a separate URL."*

2. **Never merge the PR yourself.** Ayush clicks merge after he's verified the preview URL. Your job ends at "preview URL works end-to-end, here's the URL to test."

3. **Announce branch state at every checkpoint.** Say things like: *"You're currently on `feature/monorepo-migration`. `main` is untouched. Production is still serving the old code."* This prevents confusion.

4. **Walk through the Vercel dashboard changes together.** Don't tell Ayush to "update Vercel settings" — screenshot-guide or read-aloud the exact fields he needs to change (Root Directory, Install Command, Build Command, Output Directory).

5. **If Ayush gets nervous or confused, stop and explain.** This migration is the first time production could break due to a structural change he didn't write himself. Nervousness is reasonable. Pause, explain, confirm before proceeding.

6. **Do the damage-control briefing before Step 8.** Before the first push that triggers a preview deploy, walk through the rollback layers in Section 5 so Ayush knows exactly what to do if prod breaks after merge.

7. **Explicit confirmation before Step 10 (merge).** Ayush's decision, not yours. Say: *"Ready to merge? This will deploy to production at healtho.vercel.app. If the preview URL still has issues, we should not merge."*

---

## 0. Pre-migration state capture

Before any file moves, lock down the current state so we can verify parity after.

**Capture checklist (do this immediately before migration starts):**
- [ ] Note current git SHA of `main` — this is our rollback point
- [ ] Note current Vercel production deployment URL + build settings (Root Dir, Build Cmd, Install Cmd, Output Dir, Node version)
- [ ] Export current `frontend/.env.local` to a safe location (env vars must carry over verbatim)
- [ ] Run `npm run build` in `frontend/` locally and confirm it succeeds → creates `frontend/dist/`
- [ ] Note size of production bundle (we'll compare post-migration)
- [ ] Take screenshot of Vercel dashboard showing current build config
- [ ] Confirm current Node version (likely 18.x or 20.x — Vite 6 needs ≥18)

---

## 1. Risk map — everything that can break at runtime

These are the specific failure modes for *this* repo, not generic monorepo advice.

| # | Risk | Why it matters for Healtho | Mitigation |
|---|---|---|---|
| R1 | **Vercel build path** — current setup builds `frontend/`, migration moves it to `apps/web/` | Vercel keeps building from old path → deploys fail silently | Update Vercel dashboard settings BEFORE pushing migration to any branch Vercel watches |
| R2 | **Env vars** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USDA_API_KEY` | App won't load Supabase or USDA → white screen on prod | Env vars stay in Vercel project settings; only the `.env.local` file location changes (to `apps/web/.env.local`) |
| R3 | **pnpm-lock vs package-lock** — switching package managers | If both lockfiles exist Vercel may use wrong one; builds diverge from local | Delete `package-lock.json`, commit `pnpm-lock.yaml` only; verify Vercel's install command is `pnpm install` |
| R4 | **Tailwind content globs** — `content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}']` | If paths wrong, CSS purge removes used classes → unstyled app | After move, paths relative to `apps/web/` stay the same; verify `tailwind.config.js` sits in `apps/web/` next to `index.html` |
| R5 | **Vite config resolution** — `@` aliases if any | Broken imports throughout the app | Check `vite.config.js` for `resolve.alias`; paths relative to the config file should still work |
| R6 | **Static assets in `/public`** — `hero-bg.mp4`, `benefits-bg.mp4`, `features-bg.jpg`, `healtho-icon.svg` | Landing page loses hero video, favicon breaks | These move with the frontend folder; verify they're at `apps/web/public/` after rename |
| R7 | **Google Fonts / Material Symbols** — loaded via `<link>` in `index.html` | Lexend + DM Mono + Material Symbols requests still go to Google Fonts CDN | No change — external URLs not affected by folder restructure |
| R8 | **`vercel.json` CSP headers** | Wrong location = CSP not applied = USDA API blocked | Must move with the web app to `apps/web/vercel.json` OR stay at root with build settings; Vercel reads whichever is in the **root directory set in project settings** |
| R9 | **GitHub Actions (if any)** — paths in workflows | CI runs against old paths, fails | Grep `.github/workflows/` for `frontend/` references before migration; update paths |
| R10 | **Supabase CLI / migrations** — `supabase/migrations/` folder at repo root | Migrations folder location independent of frontend | No change — stays at repo root |
| R11 | **ffmpeg binary** — dev dep used to compress videos | One-time dev tool; only matters if you re-compress videos | Stays as dev dep in whichever package.json needs it (likely root or `apps/web/`) |
| R12 | **canvas-confetti + DiceBear** — client libraries | Runtime deps need to stay in `apps/web/package.json` | Move package.json with the frontend folder; deps intact |
| R13 | **Node version** — Turborepo needs ≥18 | Local + Vercel + CI all need same Node | Add `"engines": { "node": ">=18" }` to root package.json; add `.nvmrc` file |
| R14 | **Windows path separators** — Ayush is on Windows | pnpm on Windows has occasional quirks | Use forward slashes in all config; avoid `path.join` hacks; test pnpm install locally before committing |
| R15 | **React version conflicts** — if `packages/shared` gets its own React dep later | React hooks break across instances | Hoist React to root or use pnpm peer dep config; **not an issue today** since packages are empty stubs |
| R16 | **Vite HMR** — hot reload behavior in monorepo dev | Changes to shared packages may not trigger rebuild | Not a concern today (packages empty); revisit in Prep 2 |
| R17 | **Preview deploy URLs** — Vercel gives new URL on feature branches | Existing shared preview links break | Expected; not a regression |
| R18 | **Current branch work-in-progress** — uncommitted changes | Get lost during checkout | Run `git status` first; commit or stash everything before branching |

---

## 2. Target folder structure (after migration)

```
healtho/                              ← repo root
├── .github/workflows/                ← CI (unchanged logic, paths updated)
├── .nvmrc                            ← NEW: pins Node version
├── .gitignore                        ← updated to include pnpm + turbo artifacts
├── apps/
│   └── web/                          ← was frontend/
│       ├── public/                   ← hero-bg.mp4, favicons, etc.
│       ├── src/                      ← all current src/ code
│       ├── .env.local                ← env vars (not committed)
│       ├── index.html
│       ├── package.json              ← renamed "healtho-web", scoped @healtho/web
│       ├── tailwind.config.js
│       ├── vite.config.js
│       ├── vercel.json               ← OR moved to root, TBD
│       └── postcss.config.js
├── packages/
│   ├── shared/                       ← EMPTY STUB today
│   │   └── package.json              ← @healtho/shared
│   └── ui/                           ← EMPTY STUB today
│       └── package.json              ← @healtho/ui
├── supabase/                         ← unchanged location
│   └── migrations/
├── brand/                            ← unchanged (content strategy docs)
├── package.json                      ← NEW: root workspace manifest
├── pnpm-workspace.yaml               ← NEW: defines apps/* and packages/*
├── turbo.json                        ← NEW: Turborepo pipeline config
├── pnpm-lock.yaml                    ← NEW (replaces package-lock.json)
└── README.md                         ← updated with new dev commands
```

**Key invariants:**
- No `src/` code moves during this migration — only the wrapping folder
- No imports change — `apps/web/src/pages/Dashboard.jsx` still imports from `../components/...`
- `packages/shared` and `packages/ui` are scaffolded but empty — populated in future Preps 2–5

---

## 3. Execution sequence (the order that minimizes broken states)

Each step has a verification gate before moving on. **Do not proceed to next step if gate fails.**

### Step 1 — Prep environment locally
- Install pnpm globally: `npm install -g pnpm@latest`
- Install Turborepo globally (optional but useful): `npm install -g turbo`
- Verify Node ≥18: `node --version`
- Create feature branch: `git checkout -b feature/monorepo-migration`
- **Gate:** `pnpm --version` returns a version; branch is active

### Step 2 — Create root workspace manifest (nothing moves yet)
- Create root `package.json` with minimal content:
  ```json
  { "name": "healtho", "private": true, "packageManager": "pnpm@x.y.z", "engines": { "node": ">=18" } }
  ```
- Create `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
- Create `turbo.json` with a basic pipeline for `build`, `dev`, `lint`
- Create `.nvmrc` containing Node version
- **Gate:** these are new files; current `frontend/` still builds unchanged

### Step 3 — Scaffold empty packages (no code yet)
- `mkdir -p apps packages/shared packages/ui`
- Create placeholder `packages/shared/package.json`:
  ```json
  { "name": "@healtho/shared", "version": "0.0.0", "private": true, "main": "./index.ts" }
  ```
- Same for `packages/ui/package.json`
- Touch empty `index.ts` files
- **Gate:** `pnpm install` at root succeeds, workspace is recognized

### Step 4 — Move frontend to apps/web
- `git mv frontend apps/web` (preserves history)
- Rename `apps/web/package.json` name to `"@healtho/web"` or leave as `"healtho-web"` (decision: keep as-is for minimum change)
- Delete `apps/web/package-lock.json` (pnpm owns lockfile now)
- **Gate:** `ls apps/web/` shows `src/`, `public/`, `package.json`, `index.html`, etc.

### Step 5 — Wire dev commands
- In `apps/web/package.json` scripts, verify `dev`, `build`, `preview` still use Vite
- In root `package.json`, add scripts:
  ```json
  "scripts": {
    "dev": "pnpm --filter @healtho/web dev",
    "build": "turbo run build --filter=@healtho/web",
    "web": "pnpm --filter @healtho/web"
  }
  ```
- **Gate:** `pnpm install` succeeds; `pnpm dev` from root starts Vite on localhost

### Step 6 — Local smoke test
- Run `pnpm dev` — verify Landing page loads with video + styles
- Verify login flow works (Supabase connection intact)
- Open Dashboard after login — verify macros load (USDA + Supabase both functional)
- Run `pnpm build` — verify `apps/web/dist/` is created
- **Gate:** Local build passes, no console errors, USDA search returns results

### Step 7 — Update Vercel configuration (BEFORE pushing to main)
Two options — pick one:

**Option 7A — Update via Vercel dashboard (recommended):**
- Go to Vercel project settings
- Set **Root Directory** to `apps/web`
- Set **Install Command** to `cd ../.. && pnpm install`
- Set **Build Command** to `pnpm build` (from `apps/web/`)
- Set **Output Directory** to `dist`
- Save

**Option 7B — Via `vercel.json` at repo root:**
```json
{
  "buildCommand": "pnpm turbo run build --filter=@healtho/web",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

**Gate:** Vercel dashboard reflects new settings OR `vercel.json` is in place

### Step 8 — Push feature branch, verify preview deploy
- `git add -A && git commit -m "chore: migrate to monorepo structure"`
- `git push -u origin feature/monorepo-migration`
- Watch Vercel preview deploy start
- **Gate:** Preview URL loads; Landing, Register, Login, Dashboard, food logging all functional. CSP headers present (check DevTools → Network → response headers for `/`).

### Step 9 — If preview passes, open PR
- Create PR to `main`
- Wait for preview deploy on PR (should be same as feature branch preview)
- Manual smoke test in incognito (avoids browser extension CSP overrides)
- **Gate:** PR preview works end-to-end

### Step 10 — Merge to main
- Confirm no uncommitted work on main
- Merge PR
- Watch production deploy
- **Gate:** Production at main deploys successfully; production URL works

### Step 11 — Post-merge verification
- Hit production URL, run full smoke test
- Check Vercel build logs for warnings
- Verify Supabase auth still works (real account, not test)
- **Gate:** Production is healthy

---

## 4. Verification checkpoints (what "working" means at each stage)

A deploy isn't "successful" just because Vercel says green. Specific checks:

| Checkpoint | Test | Pass criteria |
|---|---|---|
| Landing page | Load `/` | Hero video plays, Lexend loads, CTAs visible, no console errors |
| Auth flow | Register → login | New account created in Supabase, session persists, Dashboard loads |
| Dashboard | Open after login | Calorie ring renders, macro cards show goals, streak counter correct |
| Food logging | Search USDA | Results appear, selecting a food calculates macros correctly |
| Log entry | Add a food | Shows in today's log, updates macro totals, calorie ring fills |
| CSP | DevTools → network | `Content-Security-Policy` header present on all responses |
| Assets | Check /hero-bg.mp4 | Returns 200, plays |
| Fonts | Inspect element | Lexend renders on headings, DM Mono on numbers |
| Static build | `ls apps/web/dist/` | Contains `index.html`, `assets/`, sourcemaps if enabled |
| Build time | Vercel build log | No longer than current main build + 30% overhead |

---

## 5. Rollback procedure — damage control playbook

**Context for the agent:** Ayush has never done a rollback because he's never broken production badly enough to need one. Walk him through this BEFORE the first push (Step 8), not during a crisis. Make sure he knows which layer to reach for.

Four layers ranked from "nothing to undo" to "nuclear":

---

### Layer 0 — Pre-merge (where 95% of damage control happens)

**This is the real safety net.** The preview URL on the feature branch is a complete working copy of the site. If it's broken, you do not merge. Production keeps serving the old code indefinitely. Nothing is lost.

**The mental model to give Ayush:** *"Merging the PR is the moment production changes. Until then, everything you've pushed is isolated on the preview URL. You can push 50 broken commits to the feature branch and production still runs fine."*

**Decision point:** If any verification checkpoint in Section 4 fails on the preview URL, **do not proceed to Step 10**. Options:
- Fix forward on the feature branch (push more commits, preview rebuilds)
- Abandon the branch entirely (`git checkout main && git branch -D feature/monorepo-migration` → production was never affected)

---

### Layer 1 — Vercel instant rollback (~30 seconds, post-merge)

**Use this if:** Production broke after the merge.

**Ayush's exact steps:**
1. Go to `vercel.com` → log in → select the `healtho` project
2. Click **Deployments** tab at the top
3. Scroll to find the deployment from **before** the migration merge. It will be labeled "Production" with a green "Ready" status from the pre-migration date.
4. Click the `...` (three-dot menu) on that row
5. Click **"Promote to Production"**
6. Confirm the prompt
7. Wait ~30 seconds. `healtho.vercel.app` now serves the old pre-migration build.

**What this does:** Vercel keeps every deployment's build artifacts indefinitely. "Promote to Production" re-points the production domain at an old build. No rebuild, no git changes, no code touched. Instant.

**What this does NOT do:** It doesn't change your `main` branch. Git still shows the migration merge as the latest commit. This means your code and production are temporarily out of sync — that's fine for an emergency, but clean it up with Layer 2 afterward.

---

### Layer 2 — Git revert (~5 minutes, post-merge, proper cleanup)

**Use this after Layer 1** to make `main` match what Vercel is actually serving.

**Commands (agent should run these WITH Ayush, not instead of him):**
```bash
git checkout main
git pull origin main
git log --oneline -5                    # find the merge commit SHA
git revert -m 1 <merge-commit-sha>      # -m 1 is critical for merge commits
git push origin main
```

**What `-m 1` means:** When you revert a merge commit, git needs to know which parent branch was the "mainline" — `-m 1` means the first parent (main, in our case). Without this flag, git will refuse to revert a merge.

**Result:** A new commit on main that undoes the merge. Vercel redeploys automatically. Now main's code matches production.

**Important:** Git revert does NOT delete history. The original merge commit stays in history. The revert is a new commit that inverses the changes. This is the safe way.

---

### Layer 3 — Nuclear reset (rarely needed, only if Layer 2 fails)

**Use this if** Layer 2 revert gets tangled (merge conflicts, weird state).

**Commands:**
```bash
git checkout main
git reset --hard <last-good-sha-before-merge>
git push --force-with-lease origin main
```

**Warnings:**
- `--force-with-lease` rewrites remote history. Use `--force-with-lease` (not `--force`) — it refuses to push if someone else has pushed to main in the meantime.
- This deletes the migration merge from main's history entirely.
- The feature branch still exists and can be cleaned up or retried.
- If Ishaan has pulled main between the merge and this reset, his local main will diverge — he'll need to `git fetch && git reset --hard origin/main`.

**Do not use this unless Layer 2 failed.** Force-push should be the last resort.

---

### What rollback NEVER touches

| System | Why it's safe |
|---|---|
| **Supabase database** | Migration changes code structure only — no SQL migrations, no schema changes. User data, profiles, food logs, sessions all untouched. |
| **Supabase Auth** | No auth config changes. Sessions remain valid across rollback. |
| **Env variable values** | `VITE_SUPABASE_URL`, anon key, USDA key — values identical. Only the location of `.env.local` changes in the filesystem. |
| **Storage bucket (avatars)** | Not touched. All avatar URLs continue to resolve. |
| **Jira / Notion / external services** | Not part of the repo, not affected. |

---

### Pre-migration snapshot — record this BEFORE Step 8

When the agent is ready to start pushing, capture these so rollback is fast:

| Item | Value (fill in during execution) |
|---|---|
| `main` branch SHA before migration | `________________` |
| Current production deploy URL (from Vercel dashboard) | `________________` |
| Current production deploy commit SHA | `________________` |
| Vercel Root Directory setting (before change) | `________________` |
| Vercel Build Command (before change) | `________________` |
| Vercel Install Command (before change) | `________________` |
| Vercel Output Directory (before change) | `________________` |
| Timestamp of migration start | `________________` |

This snapshot is the rollback target. Paste it into a note before running Step 8.

---

### Decision tree — "production is broken after I merged, what now?"

```
Is healtho.vercel.app loading at all?
├── No / white screen / 500 errors
│   └── Layer 1 (Vercel promote). Do it now. Clean up with Layer 2 after.
│
├── Loads but auth broken / Supabase errors
│   ├── Check browser console for CSP errors → fix forward on main (env var issue likely)
│   └── If unclear cause → Layer 1, then investigate
│
├── Loads but one feature broken (e.g. USDA search)
│   ├── Minor? → fix forward on main with a new commit
│   └── Major / blocks usage → Layer 1
│
└── Build itself failed on Vercel (deploy never completed)
    └── Production still serving pre-merge build. No rollback needed.
        Fix the build issue on feature branch, force-push-with-lease if needed.
```

---

## 6. Known unknowns — things to confirm before running this plan

Questions we haven't answered yet that could cause surprises:

1. **Does Ishaan have pnpm installed?** If not, his local dev breaks on next pull. Needs a heads-up message + instructions.
2. **Are there any git submodules or git-lfs assets?** Need to verify none exist (probably not, but worth checking).
3. **Is Vercel on a Hobby or Pro plan?** Hobby has some monorepo limitations for concurrent builds — not blocking but good to know.
4. **Are there any CI workflows that reference `frontend/`?** Need to grep `.github/workflows/` before migration.
5. **Is there a `CODEOWNERS` file or similar that references paths?** Same grep.
6. **Does the brand folder (`/brand`) need to stay at root or move?** Not a web asset — should stay root.
7. **Any scripts in root `package.json` we're inheriting?** The repo currently might not have one; creating one is fine.

---

## 7. Estimated timing when we DO execute

| Phase | Time | Who |
|---|---|---|
| Steps 1–5 (local setup + move) | 20 min | Ayush + agent together |
| Step 6 (local smoke test) | 15 min | Ayush clicking, agent watching |
| Step 7 (Vercel config) | 5 min | Ayush in dashboard |
| Step 8 (push + preview deploy) | 10 min (mostly waiting) | Automated |
| Step 9 (PR review + manual test) | 15 min | Ayush |
| Step 10 (merge + prod deploy) | 10 min | Automated |
| Step 11 (post-merge verification) | 15 min | Ayush |
| **Total** | **~90 minutes** | |

Plan assumes no surprises. Budget **2 hours** with buffer.

---

## 8. What this plan explicitly does NOT do (future work)

To keep scope tight:
- Does NOT extract any code into `packages/shared` or `packages/ui` (that's ADR Prep 2–5)
- Does NOT refactor Tailwind config to consume shared tokens
- Does NOT move `lib/macroTargets.js` or any business logic
- Does NOT change TypeScript setup (project currently has none)
- Does NOT introduce new CI workflows beyond fixing existing paths
- Does NOT address Phase 4 mobile app scaffolding

When any of those happen, they'll get their own plan doc.

---

## 8.5 Post-migration: what changes for daily workflow

**Short answer: Ayush's daily workflow does not have to change.** The branch + PR + preview workflow is for the migration only. After it ships, Sprint 2 tickets and bug fixes can continue to ship straight to `main` exactly as before.

**Commands that stay identical after migration:**
```bash
# Sprint 2 ticket, bug fix, copy change — same as today
git add .
git commit -m "HLTH-XXX: whatever"
git push origin main
# → Vercel deploys to production in ~2 min
```

The only things that change in day-to-day:
- `npm run dev` becomes `pnpm dev` (from repo root)
- `npm install <package>` becomes `pnpm --filter @healtho/web add <package>` (installing to the web app specifically)
- `cd frontend` is no longer a step — commands run from repo root

**When to use the branch workflow going forward (optional):**
- Risky structural changes (another migration, major dep upgrade, auth refactor)
- Changes you want Ishaan to review before they hit prod
- Experiments you're not sure about
- The next big scope: Phase 4 mobile app scaffolding

**When to keep pushing to main (default):**
- Sprint 2 tickets
- Bug fixes
- Copy / styling tweaks
- Adding a feature inside an existing flow

The rule of thumb: if you can eyeball the change working in 30 seconds after deploy, push to main. If breakage would mean 10+ minutes of scramble, use a branch.

---

## 9. Before we execute, we need to answer

File these into open questions for the session where we DO run this:

- [x] Sprint 2 override confirmation — granted 2026-04-23
- [ ] Does Ishaan need a heads-up about pnpm + the branch?
- [ ] Vercel plan tier check — Hobby or Pro?
- [ ] Any uncommitted local work to commit first?
- [ ] Preferred day/time window (ideally when no active demos happening — a deploy blip is possible)
- [ ] Who's doing manual smoke tests post-merge? (Ayush is probably the only option)

---

## Related documents

- Architecture Decision Record (ADR-001): See chat transcript 2026-04-23 — proposes monorepo + shared packages + single Supabase. This plan executes Step 1 of the ADR's Prep items.
- Follow-on plans (to be written when each phase starts):
  - Prep 2: Extract shared business logic (`lib/macroTargets.js` → `packages/shared/macros.ts`)
  - Prep 3: Extract design tokens to shared package (after Claude Design finalizes)
  - Prep 4: Extract types
  - Prep 5: Abstract the Supabase client (for cross-platform storage adapter)

---

*This document should be updated when the plan executes, adding actual commit SHAs, Vercel deploy URLs, and any surprises encountered for the next plan author.*
