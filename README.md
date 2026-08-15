# Pluggz

The UK's curated directory of creators and the products they actually plug. Discover it here, buy it at the brand. Pluggz combines affiliate tracking, creator storefronts, product collections and video-style discovery into one platform.

This repository contains the web application: the shopper-facing marketplace, the creator dashboard, and the admin console, together with a full authentication flow.

## Features

**Shopper**
- Landing page with search, trend-of-the-week and curated lifestyle categories
- Category browsing, search results, and per-creator storefronts (`/@handle`)

**Creator**
- Application / sign-up with per-platform handles and timestamped terms acceptance
- Dashboard: views, clicks, conversion, sales value, commission, ranking and payout pipeline
- Storefront link management (paste a product URL to add it) and profile settings

**Admin**
- Creator approval queue, add-creator (dual-consent invite), brand onboarding
- Analytics, commission settings, and the twice-monthly payout pipeline

**Auth**
- Email + password with bcrypt hashing and JWT (httpOnly cookie) sessions
- Email verification and password reset via one-time, hashed tokens
- Role-based route protection (shopper / creator / admin) and rate limiting

Fully responsive, with light and dark themes.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS v4
- Prisma ORM + PostgreSQL
- Framer Motion for transitions
- Resend for transactional email (with a local dev mailbox fallback)

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

Generate an auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set `DATABASE_URL` to your PostgreSQL connection string and paste the generated
value into `AUTH_SECRET`.

### 3. Set up the database

```bash
npm run db:push     # sync the schema
npm run db:seed     # create the admin account + demo data
```

The seed creates an admin account and a demo creator (credentials are taken from
`.env` / printed by the seed script) plus a set of pending applications for the
approval queue.

### 4. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). In development, verification
and password-reset emails are captured at `/dev/mailbox` instead of being sent.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Lint |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

The app is configured for both Railway and Netlify.

### Railway

1. Create a new project and add a **PostgreSQL** plugin.
2. Deploy this repository; Railway builds it automatically (`railway.json`).
3. Set the environment variables from `.env.example` (Railway provides
   `DATABASE_URL` from the Postgres plugin).

The schema is pushed on each deploy via the start command.

### Netlify

1. Connect the repository; the build settings come from `netlify.toml`.
2. Provide a PostgreSQL database (e.g. Neon, Supabase or a Railway instance) and
   set `DATABASE_URL`, plus the other variables from `.env.example`.

## Project structure

```
src/
  app/            # routes: (marketing), (auth), creator, admin, api
  components/     # UI, brand, marketing, dashboard, admin, creator, theme
  lib/            # auth, db, email, validation, utilities
prisma/           # schema + seed
public/images/    # creator portraits and product imagery
```
