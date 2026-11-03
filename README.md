<p align="center">
  <img src="public/icons/lumo-logo.png" width="120" alt="Lumo Logo">
</p>

<h1 align="center">Lumo</h1>

<p align="center">
  <strong>AI-powered nutrition tracking from photos, meal descriptions, barcode scans and favorite foods.</strong>
</p>

<p align="center">
  Track calories using the workflow that suits you best.
</p>

<p align="center">
  Analyze a meal from a photo, describe it in natural language, scan a barcode, search industrial foods or reuse your favorite foods.
</p>

<p align="center">
  Built for daily use, not as a tech demo.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production-success" />
  <img src="https://img.shields.io/badge/Mobile-First-success" />
  <img src="https://img.shields.io/badge/PWA-Installable-purple" />
  <img src="https://img.shields.io/badge/AI-Gemini-blue" />
  <img src="https://img.shields.io/badge/Hosting-Vercel-black" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,supabase,tailwind,vercel" />
</p>

<p align="center">
  <a href="https://YOUR_PRODUCTION_URL">
    <img src="https://img.shields.io/badge/Try%20Lumo-Live%20Demo-success?style=for-the-badge" />
  </a>
</p>

---

## Overview

Lumo is a mobile-first nutrition tracking Progressive Web App designed to reduce meal logging friction while preserving flexibility.

Instead of forcing users into a single workflow, Lumo allows meals to be created through:

- 📸 AI photo analysis
- ✍️ Natural language descriptions
- 📦 Barcode scanning
- 🔎 Industrial food search
- ⭐ Favorite and recent foods

Calories, macronutrients and nutrition goals are automatically calculated and tracked.

Lumo is actively maintained and used every day in real-world conditions.

---

## Highlights

- 📱 Mobile-first user experience
- 🤖 AI meal analysis powered by Gemini
- 📸 Photo-based food recognition
- ✍️ Natural language meal descriptions
- 📦 Barcode scanning with Open Food Facts
- 🔎 Industrial food search
- ⭐ Favorite and recent foods
- 📊 Daily calorie and macro tracking
- 🔐 Google OAuth and Supabase Auth
- 🚀 Production deployment on Vercel
- 📲 Android & iOS installable PWA

---

## Live Demo

🚀 Production URL

```text
https://YOUR_PRODUCTION_URL
```

Create an account directly from the application.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/dashboard.jpg" width="220"/>
  <img src="docs/screenshots/meal-photo-analysis.jpg" width="220"/>
  <img src="docs/screenshots/history.jpg" width="220"/>
</p>

<p align="center">
  <img src="docs/screenshots/barcode-search.jpg" width="220"/>
  <img src="docs/screenshots/favorites.jpg" width="220"/>
  <img src="docs/screenshots/meal-editor.jpg" width="220"/>
</p>

---

## Real-World Usage

Lumo is not a prototype.

The application is actively used on a daily basis for meal tracking, calorie management and nutrition monitoring.

The product continues to evolve based on real-world usage patterns and everyday feedback.

---

## Product Workflow

```mermaid
flowchart TD

User[User]

User --> Photo[Photo Analysis]
User --> Text[Meal Description]
User --> Barcode[Barcode Scan]
User --> Search[Industrial Food Search]
User --> Favorites[Favorites & Recent Foods]

Photo --> Gemini
Text --> Gemini

Barcode --> OpenFoodFacts
Search --> OpenFoodFacts

Gemini --> MealBuilder
OpenFoodFacts --> MealBuilder
Favorites --> MealBuilder

MealBuilder --> Dashboard
MealBuilder --> History
MealBuilder --> NutritionTracking
```

---

## Why Lumo?

Most nutrition tracking applications require repetitive manual food entry.

Lumo focuses on reducing logging friction by combining multiple complementary workflows inside a single mobile-first experience.

Users can simply choose the most convenient option:

- Photo analysis
- Natural language descriptions
- Barcode scanning
- Industrial food search
- Favorite foods

The goal is simple:

> **Spend less time entering meals and more time focusing on nutrition.**

---

## Technical Challenges

This project explores several real-world software engineering challenges:

- AI-powered meal recognition from images
- Natural language meal interpretation
- Nutrition estimation and macronutrient calculations
- Mobile-first product design
- Progressive Web App implementation
- Offline-first considerations
- Authentication and user management
- Database security through Row Level Security (RLS)
- Food data integration through Open Food Facts
- Performance optimisation for mobile devices
- Type-safe validation through Zod

---

## Architecture

```mermaid
flowchart LR

User[Mobile User]

User --> Lumo[Lumo PWA]

Lumo --> Gemini[Gemini AI]

Lumo --> OpenFoodFacts[Open Food Facts]

Lumo --> Supabase

Supabase --> Auth[Supabase Auth]
Supabase --> DB[(PostgreSQL)]
Supabase --> Storage[Supabase Storage]
```

---

## Technology Stack

| Area | Technology |
|--------|--------|
| Frontend | Next.js 15, React 19, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide |
| State Management | TanStack Query |
| Forms & Validation | React Hook Form, Zod |
| Backend | Next.js Server Actions & Route Handlers |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth & Google OAuth |
| Security | Row Level Security (RLS) |
| AI | Gemini with OpenRouter fallback |
| Food Data | Open Food Facts |
| PWA | next-pwa |
| Hosting | Vercel |

---

## Current Features

- AI meal analysis from photos
- AI meal analysis from natural language descriptions
- Barcode scanning
- Industrial food search
- Favorite foods
- Recent foods
- Daily calorie tracking
- Macronutrient tracking
- Meal history
- Goal management
- Google OAuth
- Email authentication
- Installable PWA

---

## Roadmap

### Short-Term

- [ ] Gallery photo import
- [ ] Improved offline experience
- [ ] Additional mobile performance optimisations
- [ ] Expanded automated testing

### Long-Term

- [ ] Advanced nutrition analytics
- [ ] Enhanced reporting
- [ ] Food recommendations
- [ ] Wearable integrations
- [ ] Broader offline capabilities

---

## Requirements

- Node.js 20 LTS or newer
- npm
- A Supabase project (hosted or local)
- A Gemini API key or an OpenRouter API key

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd calorie-tracker-ai
npm install
```

### 2. Create `.env.local`

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>

# Configure at least one provider
GEMINI_API_KEY=<gemini-api-key>
OPENROUTER_API_KEY=<openrouter-api-key>
```

`GEMINI_API_KEY` and `OPENROUTER_API_KEY` are server-side secrets and should never be exposed publicly.

### 3. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Supabase Configuration

### Hosted Project

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Configure the following callback URLs:

```text
http://localhost:3000/auth/callback
https://<production-domain>/auth/callback
```

### Local Supabase

```bash
npx supabase start
npx supabase migration up --local
```

Stop services:

```bash
npx supabase stop
```

---

## AI Provider Configuration

### Primary Provider

```text
GEMINI_API_KEY
```

Current model:

```text
gemini-3.1-flash-lite
```

### Fallback Provider

```text
OPENROUTER_API_KEY
```

Current model:

```text
google/gemini-2.0-flash-001
```

If both providers are configured, Gemini is used first and OpenRouter is used as fallback.

---

## Production Build

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

---

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Configure environment variables.
3. Deploy the project.
4. Add production callback URLs to Supabase Authentication.

Installable PWA functionality requires HTTPS.

---

## Source Layout

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── types/
└── validators/

supabase/
├── migrations/
└── seed.sql
```

---

## License

**All rights reserved.**

No open-source license is granted.

You may not redistribute, modify or use this software without prior written permission from the copyright holder.