# The Hub

Personal health and focus hub. See `README.md` for layout and commands, and
`apps/hub/AGENTS.md` for Expo rules (Expo changes often, so read its docs
before touching Expo APIs).

## Conventions

- pnpm workspace. Use `pnpm`, never `npm` or `yarn`.
- Add Expo-related packages with versions from
  `node_modules/expo/bundledNativeModules.json` so they match the SDK.
- Shared logic goes in `packages/core` with Vitest tests. UI stays in
  `apps/hub`.
- Prettier settings match the portfolio repo: double quotes, semicolons,
  80 columns.
- Run `pnpm verify` before calling a ticket done.

## Language

Use the project's terms: Hub, Device, Today, Habit, Task, Journey, Mode,
Morning Drive, Quick Bits, Ambient, Dark, Companion App, Focus Guidance.
