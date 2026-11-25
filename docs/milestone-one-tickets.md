# Milestone One Tickets

Fifteen tickets that build `docs/milestone-one-spec.md`. Each one is a thin slice that can be run and seen working when it is done, sized for one coding-agent session plus review. Work them in order unless "Blocked by" says two can run side by side.

## Foundation

### 1. Scaffold the repo (done)

One repo with the React Native app (web output on), a shared logic package, TypeScript, formatting and a test runner.

- **Done when:** one command starts the app and a browser shows a page titled Today; one command runs an example test in the shared package.
- **Blocked by:** nothing.

### 2. Put it on a web address

Deploy the web output so it opens on a phone browser, redeploying on every push to main. Host on Vercel as its own Vercel project, the same way Kendall's other portfolio projects are set up. `vercel.json` already has the build settings.

- **Done when:** the Today page from ticket 1 loads on Kendall's phone from a real address.
- **Blocked by:** 1.

### 3. Supabase project and tables

Create the project and the three tables from the spec (Habit, Habit entry, Settings), with every row locked to its owner. Table changes live in the repo as migration files.

- **Done when:** a fresh database can be built from the repo alone, and a signed-out request can read nothing.
- **Blocked by:** 1.

### 4. Sign in with a password

A sign-in screen, a session that lasts until she signs out, and a redirect to sign-in when signed out. This adds the second screen, so set up Expo Router here.

- **Done when:** she signs in once on laptop and phone and is still signed in after closing the browser.
- **Blocked by:** 2, 3.

## Habits

### 5. Day rollover logic

In the shared package: given a moment and a time zone, return which day it belongs to, with the day changing at 4:00 am local time.

- **Done when:** tests pass for 11:59 pm, 3:59 am, 4:00 am, and the same moment in two time zones.
- **Blocked by:** 1. Can run alongside 2 to 4.

### 6. Show Habits and tap to complete

Today lists her Habits from the database. Tapping a complete-type Habit marks it done for the day, and tapping again undoes it. Seed the four day-one Habits.

- **Done when:** a tap survives a page refresh, and the list resets after rollover.
- **Blocked by:** 4, 5.

### 7. Increment Habits

Tap adds one, long-press subtracts one, and progress shows as "2 of 4". Reaching the number marks it done, and going past it is allowed.

- **Done when:** Water and Face and teeth work as described on laptop and phone.
- **Blocked by:** 6.

### 8. Streaks

In the shared package: calculate a Habit's streak from its entries. Show it on each Habit.

- **Done when:** tests pass for a late night, a missed day, an unfinished today, and a time-zone change; streaks show on Today.
- **Blocked by:** 6. Can run alongside 7.

### 9. Manage Habits

A screen to add a Habit (name, type, daily number for increment), rename, reorder, archive and restore.

- **Done when:** a new Habit appears on Today in the chosen position, and an archived one disappears but keeps its history when restored.
- **Blocked by:** 7.

### 10. Update a previous day

Step back to an earlier day and change that day's entries.

- **Done when:** fixing yesterday's missed check-off repairs the streak.
- **Blocked by:** 8.

## Sync and polish

### 11. Live sync

A change made on one screen appears on any other open screen without a refresh.

- **Done when:** a tap on the phone shows on the laptop within about two seconds.
- **Blocked by:** 7.

### 12. Offline taps

Taps made without a connection are kept and sent when the connection returns.

- **Done when:** three taps made in airplane mode appear on the other screen after reconnecting, with no duplicates.
- **Blocked by:** 11.

### 13. Weather

A backend function fetches the day's conditions, current temperature, high, low and sunset time from Open-Meteo, cached for the day. It uses her current location when the browser shares it and falls back to San Diego. Open-Meteo's free tier is for non-commercial use only (see `docs/later.md`).

- **Done when:** Today shows the weather for where she is, and shows San Diego's when location is denied.
- **Blocked by:** 4. Can run alongside 5 to 12.

### 14. Today layout

Final layout from the spec: one column on a phone, two on wider screens, placeholders for Tasks and events, and disabled Morning Drive and Journey buttons. Check it at the Device's 7-inch size.

- **Done when:** it reads well on phone, laptop and a browser window sized to 720 by 1280.
- **Blocked by:** 9, 13.

### 15. Polish the README

Once Today has its real look, rewrite the README to match: screenshots of Today on phone and laptop, a short story of the project, and the Hub's visual style carried into the page.

- **Done when:** someone landing on the repo can see what the Hub looks like and does without running it.
- **Blocked by:** 14.

## Then

Use it for seven days in a row. That is the spec's finish line, and what she notices in that week shapes milestone two.
