# Milestone One Spec (Today + Habits)

## Goal

A working Daybreak that Kendall opens every day on a laptop and in a phone browser, showing Today and letting her track Habits. It proves the codebase, the backend and live sync before anything harder is built.

Terms in capitals are defined in `GLOSSARY.md`.

## In scope

- The app shell: one React Native codebase, web output only for this milestone, in one repo.
- Login for a single user with a password, staying signed in until she signs out.
- Today, with the day's weather and the day's Habits.
- Creating, editing, reordering and archiving Habits.
- Checking off and incrementing Habits, with streaks.
- Live sync: a tap in one browser shows up in another within a couple of seconds.

## Out of scope

- Tasks, calendar events and Focus Guidance (milestone two). Today shows empty placeholders where they will go.
- Morning Drive, Quick Bits and Journeys. Their buttons appear on Today but are disabled.
- The iPhone build of the Companion App, the Device, Ambient and Dark.
- Everything in `docs/later.md`.

## What Kendall can do

1. Sign in once and stay signed in on that browser.
2. See today's date, the weather for the day, and her Habits on one screen.
3. Tap a complete-type Habit to mark it done, and tap again to undo.
4. Tap an increment-type Habit to add one toward its daily number, and long-press to subtract one.
5. See each Habit's current streak, and go back to update a previous day.
6. Add a Habit by giving it a name, a type (complete or increment) and, for increment, a daily number.
7. Rename, reorder or archive a Habit. Archiving hides it without deleting its history.
8. Open Daybreak on a second screen and see the same state.

## Rules

- **A Habit is done for the day** when a complete-type is tapped, or an increment-type reaches its daily number. Going past the number is allowed and still counts as done.
- **Streak** is the count of consecutive days done, ending today or yesterday. A day not yet finished never breaks a streak.
- **The day** follows the local time of the screen being used, so it moves with her when she travels.
- **Day rollover** happens at 4:00 am local time rather than midnight, so a late night still counts toward the day she is ending. Previous days stay editable, so a missed check-off can be fixed later.
- **Archived Habits** keep their history and can be restored.
- **Offline:** taps made without a connection are kept and sent when the connection returns. They are added on top of anything another screen saved in the meantime.

## Today layout

The full design is in `docs/design.md`. In short:

- **Wide screens (Device and web):** three columns. Tasks and events on the left, the Sun Dial with the weather in the centre, and Habits on the right with Morning Drive and Journey as two small buttons beneath them.
- **Phone:** one scrolling column. The Sun Dial, then Morning Drive and Journey, then Habits as four small squares, then Tasks, then events.
- **Colors follow the sun**, blending slowly through the day and into night.

Tasks and events show placeholders, and Morning Drive and Journey are disabled, until their milestones.

The Device is used in landscape, 1280 by 720, so the wide layout must work at that size.

## Data

- **Habit:** name, optional short name (for the phone squares), type (complete or increment), daily number, order, archived flag, created date.
- **Habit entry:** which Habit, which day, count for that day.
- **Settings:** fallback location for weather (San Diego), day rollover time.

Streaks are calculated from entries, not stored.

## Build notes

- TypeScript, React Native with web output, Supabase for database, login and live sync.
- Shared logic (streak maths, day rollover) lives in `packages/core` with tests, since every screen will reuse it.
- Each row is locked to the signed-in user in the database, even though there is one user.
- Weather comes from Open-Meteo, called from the backend and cached for the day. It uses her current location when the browser shares it and falls back to San Diego.

## Done when

- Kendall has used it for seven days in a row on both laptop and phone.
- A tap on one screen appears on the other without a refresh.
- Streaks are correct across a late night, a missed day and a time-zone change.
- Shared logic has passing tests for those three cases.

## Day-one Habits

1. **Work out 20+ minutes**: complete type.
2. **Water**: increment type, daily number 4 (one tap per flask).
3. **Morning walk, 5+ minutes**: complete type.
4. **Face and teeth**: increment type, daily number 2 (morning and night).
