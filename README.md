# The Hub

A personal hub for health and focus. It starts as an app I use every day and
ends up living on a small touchscreen device I'm building myself.

It's a for-fun project with two goals: make something I actually use, and try
out different AI-assisted workflows along the way.

## What it will do

- **Today**: the day at a glance, with weather, habits, tasks and events.
- **Habits**: simple daily habits, tapped off or counted up, with streaks.
- **Journeys**: focus sessions framed as a trip, with calming sound and visuals.
- **Morning Drive**: a wake-up mix of real news shows and music.

Right now it's at the very start: a Today page and the project skeleton.

## How it's built

One React Native codebase (Expo) that runs as a web app in a browser and on
the device, and later as an iPhone app. Supabase is the backend.

- `apps/hub` is the app.
- `packages/core` is shared logic with tests.

## Running it

Run these from the repo root.

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm install`   | Install everything                           |
| `pnpm dev`       | Start the app in a browser                   |
| `pnpm test`      | Run the shared package's tests               |
| `pnpm typecheck` | Type-check every package                     |
| `pnpm build:web` | Build the web app into `apps/hub/dist`       |
| `pnpm format`    | Format with Prettier                         |
| `pnpm verify`    | Format check, typecheck, tests and web build |
