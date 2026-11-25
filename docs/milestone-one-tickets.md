# Milestone One Tickets

Seventeen tickets that build `docs/milestone-one-spec.md`. Each one is a thin slice that can be run and seen working when it is done, sized for one coding-agent session plus review. Work them in order unless "Blocked by" says two can run side by side.

## Foundation

### 1. Scaffold the repo (done)

One repo with the React Native app (web output on), a shared logic package, TypeScript, formatting and a test runner.

- **Done when:** one command starts the app and a browser shows a page titled Today; one command runs an example test in the shared package.
- **Blocked by:** nothing.

### 2. Put it on a web address (done)

Deploy the web output so it opens on a phone browser, redeploying on every push to main. Host on Vercel as its own Vercel project, the same way Kendall's other portfolio projects are set up. `vercel.json` already has the build settings.

- **Done when:** the Today page from ticket 1 loads on Kendall's phone from a real address.
- **Blocked by:** 1.

### 3. Supabase project and tables (done)

Create the project and the three tables from the spec (Habit, Habit entry, Settings), with every row locked to its owner. Table changes live in the repo as migration files.

- **Done when:** a fresh database can be built from the repo alone, and a signed-out request can read nothing.
- **Blocked by:** 1.

### 4. Sign in with a password (done)

A sign-in screen, a session that lasts until she signs out, and a redirect to sign-in when signed out. This adds the second screen, so set up Expo Router here.

- **Done when:** she signs in once on laptop and phone and is still signed in after closing the browser.
- **Blocked by:** 2, 3.

## Habits

### 5. Day rollover logic (done)

In the shared package: given a moment and a time zone, return which day it belongs to, with the day changing at 4:00 am local time.

- **Done when:** tests pass for 11:59 pm, 3:59 am, 4:00 am, and the same moment in two time zones.
- **Blocked by:** 1. Can run alongside 2 to 4.

### 6. Show Habits and tap to complete (done)

Today lists her Habits from the database. Tapping a complete-type Habit marks it done for the day, and tapping again undoes it. Seed the four day-one Habits.

- **Done when:** a tap survives a page refresh, and the list resets after rollover.
- **Blocked by:** 4, 5.

### 7. Increment Habits

Tap adds one, long-press subtracts one, and progress shows as "2 of 4". Reaching the number marks it done, and going past it is allowed.

- **Done when:** Water and Face and teeth work as described on laptop and phone.
- **Blocked by:** 6.

### 8. Streaks (done)

In the shared package: calculate a Habit's streak from its entries. Show it on each Habit.

- **Done when:** tests pass for a late night, a missed day, an unfinished today, and a time-zone change; streaks show on Today.
- **Blocked by:** 6. Can run alongside 7.

### 9. Manage Habits (done)

A screen to add a Habit (name, type, daily number for increment), rename, reorder, archive and restore.

- **Done when:** a new Habit appears on Today in the chosen position, and an archived one disappears but keeps its history when restored.
- **Blocked by:** 7.

### 10. Update a previous day (done)

Step back to an earlier day and change that day's entries.

- **Done when:** fixing yesterday's missed check-off repairs the streak.
- **Blocked by:** 8.

## Sync and polish

### 11. Live sync (done)

A change made on one screen appears on any other open screen without a refresh.

- **Done when:** a tap on the phone shows on the laptop within about two seconds.
- **Blocked by:** 7.

### 12. Offline taps (done)

Taps made without a connection are kept and sent when the connection returns. They are added on top of anything another screen saved in the meantime, so neither screen's taps are lost.

- **Done when:** three taps made in airplane mode appear on the other screen after reconnecting, with no duplicates.
- **Blocked by:** 11.

### 13. Weather

A backend function fetches the day's conditions, current temperature, high, low, sunrise and sunset from Open-Meteo, cached for the day. It uses her current location when the browser shares it and falls back to San Diego. Open-Meteo's free tier is for non-commercial use only (see `docs/later.md`).

- **Done when:** Today shows the weather for where she is, and shows San Diego's when location is denied.
- **Blocked by:** 4. Can run alongside 5 to 12.

### 14. Today layout (done)

Build the layout in `docs/design.md`: three columns on wide screens, one scrolling column on the phone with Habits as small squares, placeholders for Tasks and events, and disabled Morning Drive and Journey buttons. Use the Morning colors throughout for now. Add the optional short name to Habits.

- **Done when:** it matches the design on a phone, a laptop, and a browser window sized to 1280 by 720.
- **Blocked by:** 9, 13.

### 15. Sun Dial (done)

Build the Sun Dial from `docs/design.md`: the 24-hour ring, the daylight and night stretches, the elapsed arc, the sun icon at the current time, and the weather inside. After sunset the sun becomes a moon at its real phase. The sun position and moon phase maths live in the shared package with tests. Events on the ring wait for milestone two.

- **Done when:** the dial is correct at sunrise, noon, sunset and midnight, and the moon phase matches a published calendar for three test dates.
- **Blocked by:** 13, 14.

### 16. Colors follow the sun (done)

The accent, glow and base colors blend between the six stops in `docs/design.md` based on the sun's position. The blending lives in the shared package with tests. The glow stays fixed to the bottom of the screen while the phone page scrolls.

- **Done when:** stepping a test clock through a day shows a smooth change with no jumps, and finished Habits are blue at night.
- **Blocked by:** 15.

### 17. Polish the README (done)

Once Today has its real look, rewrite the README to match: screenshots of Today on phone and laptop, a short story of the project, and the Hub's visual style carried into the page.

- **Done when:** someone landing on the repo can see what the Hub looks like and does without running it.
- **Blocked by:** 16.

## Then

Use it for seven days in a row. That is the spec's finish line, and what she notices in that week shapes milestone two.
