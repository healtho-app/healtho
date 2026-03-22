# Healtho 🍎
**Family Health & Nutrition Companion**

> Track meals, log calories, monitor macros, and hit your daily goals — built for the whole family.

🔗 **Live App:** https://healtho-git-main-ayushkapoor11s-projects.vercel.app
📐 **UI Demos (GitHub Pages):** https://healtho-app.github.io/healtho/frontend/ui-demos/healtho-dashboard.html

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
healtho/
├── frontend/                       # React web app (Vite) — Ayush
│   ├── src/
│   │   ├── components/             # Shared UI components
│   │   │   ├── Header.jsx
│   │   │   ├── CalorieRing.jsx
│   │   │   ├── MacroCard.jsx
│   │   │   ├── WaterTracker.jsx
│   │   │   ├── MealSection.jsx
│   │   │   ├── LogFoodModal.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/                  # Route-level pages
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── NotFound.jsx
│   │   ├── lib/
│   │   │   └── supabase.js         # Supabase client + auth helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js          # Design tokens (colors, fonts)
│   ├── vercel.json                 # Security headers (CSP, X-Frame-Options, etc.)
│   ├── .env.example                # Required env vars template
│   └── package.json
├── backend/                        # Express API — Ishaan
│   ├── controllers/
│   │   └── register.controller.js  # Registration logic + BMI/TDEE calculation
│   ├── middleware/
│   │   └── auth.middleware.js      # Supabase JWT verification
│   ├── routes/
│   │   └── register.routes.js      # /api/auth/register endpoints
│   ├── validators/
│   │   └── register.validator.js   # Joi schema validation
│   ├── server.js
│   └── package.json
├── docs/
│   └── testing/                    # Internal team docs
└── frontend/ui-demos/              # Static HTML mockups (GitHub Pages)
    ├── healtho-dashboard.html
    ├── healtho-register.html
    └── healtho-profile.html
```

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#121212` |
| Primary blue | `#137fec` |
| Surface card | `#1e1e1e` (slate-900) |
| Border | `#1e293b` (slate-800) |
| Protein | `#5b8def` |
| Carbs | `#e8b84b` |
| Fat | `#e07b5b` |
| Fiber | `#4caf7d` |
| Water | `#60b8d4` |

---

## Local Development

**Frontend (Ayush)**
```bash
git clone https://github.com/healtho-app/healtho.git
cd healtho/frontend

npm install

cp .env.example .env.local
# → Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

npm run dev
# → Opens at http://localhost:5173
```

**Backend (Ishaan)**
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

Create a `.env.local` file in `frontend/` (never commit this — use `.env.example` as the template):

```bash
# Supabase — get from supabase.com → your project → Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Ishaan's Express backend
# Local dev:  http://localhost:3000
# Production: https://your-backend-url.com
VITE_API_URL=http://localhost:3000
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

**Phase 2 — Live Auth & Data 🔄**
- [ ] Share Supabase keys → connect frontend auth end-to-end
- [ ] Login wired to `supabase.auth.signInWithPassword()`
- [ ] Dashboard loads real user data from Supabase
- [ ] Real food search API (USDA FoodData Central)
- [ ] Save logged meals to Supabase

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
