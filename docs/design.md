# Design

How Today looks and how the Today screen is laid out. Build to this.

The visual reference is a Claude design canvas (private to Kendall):
https://claude.ai/artifact/Sj9jTyP6V55THKCPcizVQ8

The boards that count are **G** and **H** (Device and web), the four
"Colors through the day" boards, and **Phone 3 · Combined**. Everything else
on the canvas is an earlier exploration.

## Principles

- Dark, never flat. Tiles are raised glass: a lit top edge, a soft shadow,
  and a glow behind them.
- One tap to get somewhere, one more tap to act. Every tile that does
  something is one large button. Touch targets are at least 44 px.
- The colors follow the sun. Nothing snaps; everything blends slowly.
- Font: Inter. Numbers use the same font.

## Today on the Device and on the web (wide screens)

Designed at 1280 by 720, landscape. Padding 32, gaps 20.

- **Header:** "Today" (36 px, semibold), the date in muted text, and the time
  at the right. A Settings button will sit to the right of the time later;
  leave it out for now (see `docs/later.md`).
- **Three columns:** 300 px, flexible, 320 px.
  - **Left:** the Top three Tasks tile, then the Up next events tile. Each
    row has a main line (18 px) and a muted second line (13 px).
  - **Centre:** the Sun Dial with the weather inside it.
  - **Right:** one row per Habit, sharing the height equally, then Morning
    Drive and Journey as two small buttons side by side.
- **Habit row:** a round icon chip, the name (19 px, semibold), a status line
  ("2 of 4", "Done", or the habit's note), a segmented progress bar for
  increment Habits, and the streak at the right.

## Today on the phone (narrow screens)

Designed at 390 wide. One scrolling column, padding 20, gaps 14, in this
order:

1. Header: "Today" and the date.
2. The Sun Dial, 320 px, with the weather inside it. No event names on the
   ring at this size, only dots.
3. Morning Drive and Journey, side by side.
4. Habits as small squares, four across: icon chip, short name, progress.
5. Top three Tasks.
6. Up next events.

The dial, the two buttons and the habit squares fit on the first screen.

Habit squares need a short name ("Walk", "Face"), so a Habit has an optional
short name that falls back to its full name.

## The Sun Dial

A 24-hour ring. Noon is at the top, midnight at the bottom, and time runs
clockwise.

- A faint ring of 24 hour ticks, with four longer ticks at midnight, 6 am,
  noon and 6 pm. No words on the ring.
- The daylight stretch (sunrise to sunset) is drawn in muted amber,
  `rgba(255,180,107,.32)`, at every time of day. The night stretch is
  `rgba(190,200,255,.2)`.
- The elapsed part is drawn in the current accent color: from sunrise to now
  during the day, from sunset to now at night.
- A sun icon sits on the ring at the current time. After sunset it becomes a
  moon drawn at its real phase, worked out from the date.
- Events are dots on the ring at their start times. Past events are dimmed.
  On wide screens each dot has a label outside the ring ("Standup 10:00").
- Inside the ring: the temperature (large), "Sunny in San Diego", a muted
  line with the high and low (or the moon phase at night), and a small line
  with the sunrise and sunset times.

## Colors

Fixed colors:

| Token      | Value     | Use                         |
| ---------- | --------- | --------------------------- |
| Text       | `#f6f1ea` | Main text                   |
| Muted      | `#bdb3a8` | Secondary text              |
| Accent ink | `#1c120a` | Icons on an accent fill     |
| Chip       | 10% white | Icon chip on a resting tile |
| Pip        | 18% white | Empty progress segment      |

Colors that follow the sun. These six are stops; blend smoothly between the
two nearest, based on where the sun is that day (not the clock), so summer
and winter differ:

| Stop       | When                | Accent    | Glow      | Base      |
| ---------- | ------------------- | --------- | --------- | --------- |
| Dawn       | Sunrise             | `#ffb3a1` | `#d9647a` | `#0b0a09` |
| Morning    | About 1.5 h after   | `#ffb46b` | `#e8923f` | `#0b0a09` |
| Midday     | Solar noon          | `#ffd166` | `#e0a63a` | `#0b0a09` |
| Sunset     | Sunset              | `#ff9480` | `#cf4f7c` | `#0b0a09` |
| Evening    | About 3.5 h after   | `#a9b8ff` | `#6a4fc0` | `#08080c` |
| Late night | Middle of the night | `#8fb4ff` | `#2c4aa8` | `#07080d` |

The accent colors text highlights, progress, check marks, the elapsed arc and
finished Habits. All of them change together.

## The glow

The screen background is the base color with a glow rising from the bottom:

```
radial-gradient(120% 75% at 50% 118%, GLOW 0%, GLOW at 42% opacity 26%, transparent 62%), BASE
```

The glow is fixed to the bottom of the screen. On the phone the content
scrolls over it; it does not sit at the end of the page.

## Tiles

- **Resting tile:** `rgba(26,23,21,.62)` fill, 1 px border at 13% white,
  24 px background blur, a 1 px inner highlight at the top, and a soft drop
  shadow (`0 18px 40px` at 40% black). Corner radius 28 for tiles, 26 for
  habit rows, 24 for the small buttons, 20 for habit squares.
- **Finished Habit:** the whole tile tints. A diagonal gradient from the
  accent at 36% to the resting fill, a border in the accent at 55%, and a
  soft outer glow in the glow color. Its icon chip fills with the accent and
  shows a check mark.

## Milestone one

Tasks, events, Morning Drive and Journey appear in the layout as designed,
but Tasks and events show placeholders and the two buttons are disabled.
Motion (a breathing glow, an animation when a Habit completes) comes later.
