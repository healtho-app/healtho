# Healtho
**Family Health & Nutrition Companion**

> Track meals, log calories, monitor macros, and hit your daily goals — built for the whole family.

🔗 **Live App:** https://healtho-git-main-ayushkapoor11s-projects.vercel.app
📐 **UI Demos (GitHub Pages):** https://healtho-app.github.io/healtho/ui-demos/healtho-dashboard.html

### Follow us
| Platform | Handle |
|----------|--------|
| 𝕏 / Twitter | [@HealthO_10k](https://x.com/HealthO_10k) |
| Instagram | [@healtho_10k](https://www.instagram.com/healtho_10k/) |
| TikTok | [@healtho_10k](https://www.tiktok.com/@healtho_10k) |

---

## What Healtho Does

- 📊 **Daily Dashboard** — calorie ring, macro tracker, water intake, meal log, and streaks
- 🍽️ **Meal Logging** — log breakfast, lunch, dinner, and snacks with food search
- 🧮 **Calorie Calculator** — personalised daily goal using Mifflin-St Jeor (BMR × activity multiplier)
- 📋 **BMI Tracking** — calculated from height and weight, shown with a live gauge
- 👤 **User Profiles** — full profile summary after registration
- 🔐 **Auth** — email/password sign-up and login with form validation (Google/Apple OAuth planned)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Web | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Font | Lexend (display) + DM Mono |
| Icons | Google Material Symbols |
| Backend / DB | Supabase (PostgreSQL) — in progress |
| Mobile | React Native + Expo — planned |
| Deployment | Vercel (web), GitHub Pages (UI demos) |

---

## Pages & Routes

| Route | Page | Status |
|-------|------|--------|
| `/` | Redirects → `/login` | ✅ |
| `/login` | Login with validation | ✅ |
| `/register` | 3-step registration form | ✅ |
| `/profile` | Profile summary + BMI + calorie goal | ✅ |
| `/dashboard` | Daily nutrition dashboard | ✅ |
| `/*` | 404 Not Found page | ✅ |

---

## Folder Structure

```
healtho/                              ← repo root (pnpm workspace)
├── apps/
│   └── web/                          # React web app (Vite) — Ayush
│       ├── src/
│       │   ├── components/           # Shared UI components
│       │   ├── pages/                # Route-level pages
│       │   ├── lib/
│       │   │   ├── supabase.js       # Supabase client + auth helpers
│       │   │   └── macroTargets.js   # Macro calculation helpers
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── public/                   # hero-bg.mp4, healtho-icon.svg, etc.
│       ├── tailwind.config.js        # Design tokens (colors, fonts)
│       ├── .env.example              # Required env vars template
│       └── package.json              # name: "healtho-web"
├── packages/
│   ├── shared/                       # @healtho/shared — empty stub today
│   │   └── index.ts                  # Populated in Prep 2 (lib extraction)
│   └── ui/                           # @healtho/ui — empty stub today
│       └── index.ts                  # Populated in Prep 3-5
├── backend/                          # Express API — Ishaan (separate service)
│   ├── controllers/, middleware/, routes/, validators/
│   ├── server.js
│   └── package.json
├── automation/                       # Weekly content brief generator (GH Actions)
│   ├── generate-content.js
│   └── package.json
├── ui-demos/                         # Static HTML mockups (GitHub Pages)
│   ├── healtho-dashboard.html
│   ├── healtho-register.html
│   └── healtho-profile.html
├── supabase/migrations/              # Supabase schema migrations
├── docs/                             # Internal docs
├── brand/                            # Content strategy + assets
├── make-guide.js                     # Family Guide docx generator (root-level)
├── package.json                      # Root workspace manifest (pnpm)
├── pnpm-workspace.yaml               # Defines apps/* + packages/*
├── turbo.json                        # Turborepo pipeline config
├── vercel.json                       # Build settings + CSP headers
├── .nvmrc                            # Node 20
└── .gitattributes                    # Line-ending policy (LF)
```

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#030213` (deep navy) |
| Primary purple | `#8b5cf6` (Pulse Purple) |
| Brand gradient | `#e879f9` → `#8b5cf6` → `#22d3ee` (Pink → Purple → Cyan) |
| Surface card | `#0e0b1e` |
| Surface 2 | `#1a1640` |
| Border | `#1e293b` (slate-800) |
| Protein | `#5b8def` |
| Carbs | `#e8b84b` |
| Fat | `#e07b5b` |
| Fiber | `#4caf7d` |
| Water | `#60b8d4` |

---

## Local Development

**Web App (Ayush)**
```bash
git clone https://github.com/healtho-app/healtho.git
cd healtho

# One-time: install pnpm globally if you don't have it
npm install -g pnpm@latest

# Install all workspace deps (apps/web, packages/shared, packages/ui)
pnpm install

# Set up env vars
cp apps/web/.env.example apps/web/.env.local
# → Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USDA_API_KEY, VITE_API_URL

# Run the web app
pnpm dev
# → Opens apps/web at http://localhost:5173
```

**Backend (Ishaan)** — separate service, not part of the pnpm workspace
```bash
cd healtho/backend

npm install

# Create a .env file with:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# PORT=3000

npm run dev
# → Runs at http://localhost:3000
```

---

## Environment Variables

Create a `.env.local` file in `apps/web/` (never commit this — use `apps/web/.env.example` as the template):

```bash
# Supabase — get from supabase.com → your project → Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Ishaan's Express backend
# Local dev:  http://localhost:3000
# Production: https://your-backend-url.com
VITE_API_URL=http://localhost:3000

# USDA FoodData Central API key (https://fdc.nal.usda.gov/api-key-signup.html)
# Used by LogFoodModal for fallback food search
VITE_USDA_API_KEY=your-usda-api-key-here
```

> `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` come from the Supabase project dashboard (Ishaan owns this).
> `VITE_API_URL` points to Ishaan's Express server — update to the deployed URL once it's live.

---

## API Endpoints (Ishaan's Backend)

Base URL: `VITE_API_URL` (default: `http://localhost:3000`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/` | None | Health check — returns `{ message: "Healtho API is running 🚀" }` |
| `POST` | `/api/auth/register` | None | Step 1 — create account (name, email, password) |
| `POST` | `/api/auth/register/metrics` | Bearer JWT | Step 2 — save body stats (age, height, weight, unit) |
| `POST` | `/api/auth/register/activity` | Bearer JWT | Step 3 — set activity level, returns `daily_calorie_goal` |

**Registration flow (frontend → backend):**
1. `POST /api/auth/register` → user created in Supabase Auth + `profiles` table
2. Frontend calls `supabase.auth.signInWithPassword()` to obtain JWT
3. `POST /api/auth/register/metrics` with `Authorization: Bearer <jwt>`
4. `POST /api/auth/register/activity` with `Authorization: Bearer <jwt>` → registration complete

---

## Team

| Name | Role | Location |
|------|------|----------|
| Ajay | Project Manager | India |
| Anu | QA & Testing | India |
| Ishaan | Backend (Supabase / API) | USA — East |
| Ayush | Frontend & Mobile | USA — West (Mesa, AZ) |

---

## Roadmap

**Phase 1 — Foundation ✅**
- [x] HTML mockups (Dashboard, Register, Profile)
- [x] React app with React Router
- [x] Login page with validation
- [x] 3-step registration with validation + email OTP (Step 4)
- [x] Profile summary page with BMI + calorie goal
- [x] Dashboard with calorie ring, macros, water tracker, meal log
- [x] Supabase client + auth helpers
- [x] 404 Not Found page
- [x] Security headers (`vercel.json`), ProtectedRoute, sessionStorage auth
- [x] Sign out button, smart logo routing, edit profile
- [x] Express backend — 3-step registration API (Ishaan)
- [x] Frontend wired to backend registration endpoints

**Phase 2 — Live Auth & Data ✅**
- [x] Supabase keys connected — registration and login live
- [x] Login wired to `supabase.auth.signInWithPassword()`
- [x] Dashboard loads real calorie goal, BMI, and weight from Supabase
- [x] Profile reads and saves to `profiles` table
- [x] npm audit clean — 0 vulnerabilities (Vite upgraded to 6.4.1)

**Phase 3 — Meal Logging & Food Data 🔄**
- [ ] Real food search API (USDA FoodData Central)
- [ ] Save logged meals to Supabase (`meal_logs` table)
- [ ] Dashboard consumed calories + macros from real meal data

**Phase 3 — Mobile & Growth**
- [ ] React Native mobile app (Expo)
- [ ] Google / Apple OAuth
- [ ] Push notifications
- [ ] Family sharing / multi-profile support

---

## Branching Strategy

```
main          ← production (deploys to Vercel)
└── dev       ← integration branch
    ├── feature/ayush-*   ← Ayush's frontend features
    ├── feature/ishaan-*  ← Ishaan's backend features
    └── feature/anu-*     ← QA / test branches
```

---

*© 2025 Healtho. All rights reserved.*
