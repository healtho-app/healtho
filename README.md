# Healtho 🍎
**Family Health & Nutrition Companion**

> Track meals, log calories, monitor macros, and hit your daily goals — built for the whole family.

🔗 **Live App:** https://healtho-cyb250xes-ayushkapoor11s-projects.vercel.app
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
├── frontend/                   # React web app (Vite)
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   │   ├── Header.jsx
│   │   │   ├── CalorieRing.jsx
│   │   │   ├── MacroCard.jsx
│   │   │   ├── WaterTracker.jsx
│   │   │   ├── MealSection.jsx
│   │   │   └── LogFoodModal.jsx
│   │   ├── pages/              # Route-level pages
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── NotFound.jsx
│   │   ├── lib/
│   │   │   └── supabase.js     # Supabase client + auth helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js      # Design tokens (colors, fonts)
│   ├── .env.example            # Required env vars template
│   └── package.json
└── frontend/ui-demos/          # Static HTML mockups (GitHub Pages)
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

```bash
# Clone the repo
git clone https://github.com/healtho-app/healtho.git
cd healtho/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# → Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
# → Opens at http://localhost:5173
```

---

## Environment Variables

Create a `.env.local` file in `frontend/` (never commit this):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> These keys come from the Supabase project dashboard (Ishaan sets these up on the backend side).

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

- [x] HTML mockups (Dashboard, Register, Profile)
- [x] React app with React Router
- [x] Login page with validation
- [x] 3-step registration with validation
- [x] Profile summary page
- [x] Dashboard with calorie ring, macros, water, meals
- [x] Supabase client file
- [x] 404 Not Found page
- [ ] Connect Supabase Auth (awaiting backend keys from Ishaan)
- [ ] Real food search API integration
- [ ] React Native mobile app (Expo)
- [ ] Google / Apple OAuth
- [ ] Push notifications

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
