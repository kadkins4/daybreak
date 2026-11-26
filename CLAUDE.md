# Today

A personal app for health and focus, formerly called Today. See `README.md` for layout and commands, and
`apps/today/AGENTS.md` for Expo rules (Expo changes often, so read its docs
before touching Expo APIs).

## Docs

- `GLOSSARY.md`: the project's language. Use these terms, and update it when
  a new term is settled.
- `docs/adr/`: decisions that are hard to reverse, one short file each.
- `docs/milestone-one-spec.md` and `docs/milestone-one-tickets.md`: what is
  being built now. Work one ticket at a time and mark it done in the file.
- `docs/design.md`: how Today looks and how the Today screen is laid out. Build
  screens to this.
- `docs/later.md`: parked ideas. Don't build these.

## Conventions

- pnpm workspace. Use `pnpm`, never `npm` or `yarn`.
- Add Expo-related packages with versions from
  `node_modules/expo/bundledNativeModules.json` so they match the SDK.
- Shared logic goes in `packages/core` with Vitest tests. UI stays in
  `apps/today`.
- Prettier settings match the portfolio repo: double quotes, semicolons,
  80 columns.
- Run `pnpm verify` before calling a ticket done.

## Language

Use the project's terms: Today, Today screen, Device, Habit, Task, Journey, Mode,
Morning Drive, Quick Bits, Ambient, Dark, Companion App, Focus Guidance.
