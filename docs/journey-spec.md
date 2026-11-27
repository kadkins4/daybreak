# Journey Spec (flights)

## Goal

Kenny taps Journey on Today, picks an airport on a map, and focuses for as long as the flight there takes. He watches the plane cross real country at close range, lands, and starts the next Journey from wherever he landed.

Terms in capitals are defined in `GLOSSARY.md`. The decisions here came out of the design session on 2026-11-26 and 27.

## In scope

- One Mode: airplane.
- Airports in the lower 48 states that have scheduled airline service: 442 of them.
- A map for picking a destination and a close map for watching the flight.
- A ticket, takeoff, the flight, landing, pause and ending early.
- Round Trips of any length.
- Miles and airports visited, as running totals.
- One Journey shared by every screen Kenny is signed in on.
- Engine and cabin sound made in the browser, with a mute button.

## Out of scope

- Train and every other Mode.
- Alaska, Hawaii, Canada, Mexico and small airstrips with no airline service.
- Levels, badges or streaks for Miles.
- Any link between Journeys and Habits.
- Recorded audio, and sound through the Device's Spotify speaker.
- The iPhone build. The map is built for the web app, which is also what the Device runs.
- Everything in `docs/later.md`.

## What Kenny can do

1. Tap Journey on Today and see a map centered on his Current Airport.
2. Tap any airport to see how long the flight is and how many miles.
3. Set a length with an hours and minutes picker. A ring on the map shows how far that reaches, the airports near the ring are highlighted, and a Round Trip of exactly that length is always offered.
4. Get a ticket for the flight, type what he is focusing on if he wants to, and punch it to take off.
5. Watch the flight up close, with towns and their names passing under the plane.
6. Always see time left, miles flown and miles to go, and tap to see the whole route for a few seconds.
7. Switch the map between north up and heading up by tapping the compass.
8. Minimize the flight, use Today as normal, and see the time left on Today.
9. Pause and resume.
10. End the flight early, after being told where he will land and with how many miles.
11. Land, see a summary, and find himself at the destination next time.
12. Open Daybreak on a second screen and see the same flight in the same state.

## Rules

- **Flight time** is one formula on the straight-line distance between two airports: 12 minutes plus the miles divided by 500 mph, rounded to the minute. Baltimore to Philadelphia is 23 minutes. There is no upper limit.
- **The destination sets the length.** A length that matches no airport is flown as a Round Trip.
- **A Round Trip** takes off from the Current Airport, flies out, makes a real U-turn and lands where it started. It can be any length from 5 minutes up. The heading is picked for him, toward a different airport each time, so the route stays over land. It adds Miles and does not change the Current Airport. Its Miles come from the flight-time formula run backwards, and never fewer than 2.5 miles a minute, so a 5 minute trip still covers 12.5 miles.
- **Takeoff and landing are inside the flight time.** The first 30 seconds are the takeoff and the last 45 seconds are the landing. Touchdown is zero on the clock.
- **Landing is automatic.** It happens when the time runs out, even if the flight is minimized or Daybreak is closed. The summary waits until he next opens Daybreak. There is no "keep going": more focus is another Journey.
- **Pause** freezes the flight on every screen. The map stops and the sound stops. Only flying time counts toward the flight.
- **A paused Journey ends at day rollover** (4:00 am), by the same rule as ending early. A Journey that is flying at rollover keeps flying.
- **Ending early is a Diversion.** He lands at the last airport he has passed, meaning the most recent airport within 30 miles of the route that is behind the plane, and earns the Miles to that point on the route. If no airport is behind him yet he is back where he took off with no Miles. Ending a Round Trip early lands him where he took off with the Miles flown. Focus minutes are always kept.
- **Ending early needs a second tap,** on a message that says where he will land and with how many Miles.
- **One Journey at a time.**
- **Current Airport.** The first Journey starts at the airport nearest his real location. After that it is wherever he last landed. If he does not share his location, he picks an airport by hand.
- **"Have you moved?"** Each takeoff saves where he really was. When he opens Journey more than 100 miles from that spot, Daybreak asks whether to continue from the Current Airport or move to the airport nearest him now.
- **What he is focusing on** is optional and saved with the Journey.
- **Miles** are for fun: a running total and a count of airports visited.

## Screens

- **Picking:** the map zoomed out in a flat, clean look. State lines, and a labelled dot for every airport once zoomed in close. Tapping where several airports crowd together zooms in to spread them apart. A bar at the top holds the length picker. A card at the bottom names the chosen airport with its time and miles.
- **Ticket:** from, to, length, the optional focus line and a punch.
- **In flight:** the same map zoomed in to about 60 miles from top to bottom, following the plane. Roads glow, so towns read as clusters of light. Bigger towns and every airport show a faint name. North is up unless the compass is tapped. A strip at the bottom shows origin, destination, time left, miles flown, miles to go and a progress bar.
- **Paused:** the flight screen, frozen, with resume and end.
- **Landed:** minutes, miles, the new totals and where he is now.
- **Today:** the Journey button reads "In flight, 32 min left" while one is running and opens the flight.
- The map takes Daybreak's sun colors, like the rest of the app.

## Sound

- Made in the browser, with no audio files: a roar at takeoff that settles into a low engine hum, and an occasional two-tone attendant chime. A chime at landing.
- Plays on the screen where the ticket was punched, and keeps playing when the flight is minimized. Mute is remembered per screen.
- Stops while the flight is paused.
- Browsers only allow sound after a tap, so a screen that joins a flight already in progress starts muted.

## Data

- **Airport:** code, name, city, latitude, longitude and a size. A fixed list shipped with the app, built from the public-domain OurAirports data.
- **Journey:** Mode, origin, destination (none for a Round Trip), outbound heading (Round Trip only), planned length, planned miles, focus text, status (flying, paused, landed or diverted), takeoff time, flying time banked at the last pause, time of the last resume, time of the last pause, end time, the airport landed at, Miles earned, and his real location at takeoff.
- **Settings:** the Current Airport.

Time left is worked out from the banked flying time and the last resume, so every screen agrees and nothing ticks in the database. Totals are calculated from Journeys, not stored.

## Build notes

- The map is MapLibre on OpenFreeMap tiles. See `docs/adr/0010-journey-maps-use-maplibre-on-openstreetmap-tiles.md`.
- MapLibre is held at version 5. Version 6 loads its background worker in a way the app's bundler cannot package.
- The map needs a connection to load. If the tiles fail, the flight still runs and the strip still counts down.
- Airports, distance, flight time, the route, the U-turn and the Diversion rule live in `packages/core` with tests.
- The landing summary shows once on each screen, for up to 18 hours after the landing. Which summaries a screen has shown is kept on that screen.
- For testing, `?fly=60` in the address makes flights run sixty times faster on that screen.
- The two prototypes are in `~/.claude/prototypes/daybreak-journey-map/`: `index.html` for the looks and `flight.html` for the close flight.
- The picker and the ticket are our own designs. Other focus apps use a flight theme too, and none of their artwork or layouts are copied.

## Done when

- Kenny has flown at least five Journeys, including one Round Trip, one pause and one Diversion.
- A flight started on the laptop shows on the phone in the same state, and lands on time with both closed.
- The Diversion, Round Trip and flight-time rules have passing tests.
- The flight screen stays smooth at 1280 by 720.
