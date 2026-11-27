# Journey Tickets

Thirteen tickets that build `docs/journey-spec.md`. Each one is a thin slice that can be run and seen working when it is done. Work them in order unless "Blocked by" says two can run side by side.

## Foundation

### 1. Airports and flight maths (done)

In the shared package: the airport list, built by a script from the OurAirports data (lower 48, scheduled airline service). Functions for distance, flight time, a point and a heading along the route, and the nearest airport to a location. Record the final airport count in the spec.

- **Done when:** tests pass for Baltimore to Philadelphia (23 minutes), a coast-to-coast flight, and the nearest airport to downtown San Diego.
- **Blocked by:** nothing.

### 2. Journeys in the database (done)

A Journey table and a Current Airport setting, each row locked to its owner, as migration files. Journey changes arrive live on other screens.

- **Done when:** a fresh database builds from the repo, and a signed-out request can read nothing.
- **Blocked by:** nothing. Can run alongside 1.

### 3. The map (done)

Add MapLibre as a web-only component, on OpenFreeMap tiles, recolored to the sun colors. The Journey button on Today opens a full-screen map with pan and zoom, centered on the Current Airport. The first time, the Current Airport is the one nearest his real location, or one he picks by hand.

- **Done when:** the map opens from Today on laptop and phone, follows day and night colors, and shows the attribution.
- **Blocked by:** 1.

## Taking a flight

### 4. Pick a destination

Airport dots and labels on the map. Tapping one shows its time and miles on a card. Tapping a crowded spot zooms in. The length picker draws a ring and highlights airports near it.

- **Done when:** Washington National, Dulles and Baltimore can each be picked on a phone, and a 45 minute ring from San Diego highlights Las Vegas.
- **Blocked by:** 3.

### 5. Ticket and takeoff

The ticket screen with the optional focus line. Punching it saves a flying Journey.

- **Done when:** a punched ticket survives a page refresh as a Journey in flight.
- **Blocked by:** 2, 4.

### 6. The flight

The close map following the plane, the bottom strip, town and airport names, the compass switch, the tap to see the whole route, and the takeoff and landing animations.

- **Done when:** a 23 minute flight to Philadelphia can be watched from takeoff to touchdown, and it is smooth at 1280 by 720.
- **Blocked by:** 5.

### 7. Landing and Miles

The flight lands by itself, shows the summary, moves the Current Airport and adds to the totals. A flight that ends while Daybreak is closed lands on time and shows its summary on the next open.

- **Done when:** the next Journey starts from the airport just landed at, and the totals are right after two flights.
- **Blocked by:** 6.

### 8. Minimize and sync

A minimize button back to Today. Today's Journey button shows the time left. A second screen shows the same flight.

- **Done when:** a flight started on the laptop appears on the phone within a couple of seconds, and Habits can be tapped while it runs.
- **Blocked by:** 7.

## Interruptions

### 9. Pause

Pause and resume, shared across screens. Only flying time counts. A paused Journey ends at day rollover.

- **Done when:** pausing on the phone freezes the laptop, and time left is the same on both after resuming.
- **Blocked by:** 8.

### 10. Ending early

The Diversion rule in the shared package, and the two-tap message that names the landing airport and the Miles.

- **Done when:** tests pass for an airport passed, none passed yet, and a Round Trip. Ending a flight south from Baltimore after passing Richmond lands him in Richmond.
- **Blocked by:** 7. Can run alongside 9.

## Finishing

### 11. Sound

The takeoff roar, the engine hum, the attendant chime and the landing chime, made in the browser. A mute button remembered per screen.

- **Done when:** the hum loops for 30 minutes with no audible seam, stops on pause, and mute holds after a refresh.
- **Blocked by:** 6. Can run alongside 7 to 10.

### 12. Round Trips

The Round Trip offer in the length picker, the outbound heading toward a different airport each time, the U-turn path, and landing back at the start.

- **Done when:** a 20 minute Round Trip shows the turn, lands where it started, adds Miles and leaves the Current Airport alone.
- **Blocked by:** 7.

### 13. "Have you moved?"

Save his real location at takeoff. Ask on opening Journey when he is more than 100 miles from it.

- **Done when:** with a faked location in another city, Journey asks whether to continue or move, and both answers work.
- **Blocked by:** 7.
