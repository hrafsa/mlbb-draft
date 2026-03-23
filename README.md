# MLBB Draft Intelligence

MLBB Draft Intelligence is a Next.js application that helps you simulate Mobile Legends draft phases and get real-time hero recommendations.

## Features

- Rank-based draft flow (`Epic`, `Legend`, `Mythic`) with different ban/pick slot rules.
- First pick / second pick support (`FP` / `SP`).
- Recommendation engine that combines:
  - base meta score,
  - counter matchup impact,
  - ally synergy impact,
  - role fulfillment constraints.
- Draft board UI for ally and enemy bans/picks.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Framer Motion

## Getting Started

Prerequisites:

- Node.js 20+ (recommended)
- npm 10+ (or any compatible package manager)

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Run Locally (Step-by-Step)

1. Clone the repository.
2. Move into the project folder.
3. Install dependencies with `npm install`.
4. Start development mode with `npm run dev`.
5. Open `http://localhost:3000` in your browser.

## Available Scripts

- `npm run dev` - Start local development server.
- `npm run build` - Build for production.
- `npm run start` - Run the production server.
- `npm run lint` - Run ESLint.

## Project Structure

```text
app/
	layout.tsx
	page.tsx
src/
	components/
		DraftDashboard.tsx
		SpotlightCard.tsx
	lib/
		api.ts
		DraftEngine.ts
		utils.ts
```

## How Recommendation Works

The recommendation score is based on:

```text
totalScore = baseScore + counterModifier + synergyModifier
```

Additional logic:

- Strong vs enemy hero: `+20`
- Weak vs enemy hero: `-25`
- Assist/synergy with ally hero: `+15`
- Single-role hero with already taken role: strong penalty to avoid duplicate critical role picks.

## Draft Flow Overview

The system evaluates each draft state in real time:

1. Read current ally picks, enemy picks, and bans.
2. Remove already-picked and banned heroes from candidates.
3. Compute each candidate hero score using base score + matchup + synergy modifiers.
4. Apply role constraints to avoid invalid or low-value compositions.
5. Sort by total score and return top recommendations.

## Notes

- If API data is unavailable, the app shows a warning state in the dashboard.
- You can customize scoring values in `src/lib/DraftEngine.ts`.

## Deployment

Deploy this project using any Next.js-compatible platform (for example Vercel).

- Next.js deployment docs: https://nextjs.org/docs/app/building-your-application/deploying

### Vercel Daily Refresh (3 PM WIB)

This project includes a Vercel cron schedule in `vercel.json`:

- `0 8 * * *` (UTC), which is `15:00` WIB.

The cron calls `GET /api/cron/refresh-heroes` and refreshes cached hero data.

Required environment variable:

- `CRON_SECRET`: token used as `Authorization: Bearer <CRON_SECRET>`.

Set this variable in your Vercel project settings so the refresh endpoint stays protected.
