import { LANDING_SECONDS, TAKEOFF_SECONDS } from "@daybreak/core";

/**
 * The sound of a flight, made in the browser with no audio files: engine
 * rumble from filtered noise and two low tones, a little cabin hiss, and a
 * two-tone chime.
 */
interface Engine {
  context: AudioContext;
  master: GainNode;
  rumble: GainNode;
  filters: BiquadFilterNode[];
}

let engine: Engine | null = null;
let stopping: ReturnType<typeof setTimeout> | null = null;

const CRUISE = 0.42;
const MASTER = 0.5;

/**
 * How hard the engines are working, from 0 to 1: full for the takeoff,
 * settling to a cruise, and easing off through the landing.
 */
export function enginePower(seconds: number, plannedSeconds: number): number {
  const left = plannedSeconds - seconds;
  if (left < LANDING_SECONDS) {
    return 0.24 + (CRUISE - 0.24) * Math.max(0, left / LANDING_SECONDS);
  }
  if (seconds < TAKEOFF_SECONDS) return 1;
  return CRUISE + (1 - CRUISE) * Math.exp(-(seconds - TAKEOFF_SECONDS) / 14);
}

function build(): Engine | null {
  if (typeof window === "undefined") return null;
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return null;
  const context = new Context();

  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);

  // Three seconds of plain noise, looped. Each sample is independent of
  // the last, so the join cannot be heard. The filters come after it.
  const length = context.sampleRate * 3;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const rumble = context.createGain();
  rumble.gain.value = CRUISE;
  rumble.connect(master);

  const filters = [0, 1].map(() => {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 260;
    filter.Q.value = 0.4;
    return filter;
  });
  const lift = context.createGain();
  lift.gain.value = 5;
  noise.connect(filters[0]).connect(filters[1]).connect(lift).connect(rumble);

  // Two low tones a fifth apart, for the drone under the rumble.
  const drone = context.createBiquadFilter();
  drone.type = "lowpass";
  drone.frequency.value = 150;
  const droneLevel = context.createGain();
  droneLevel.gain.value = 0.16;
  drone.connect(droneLevel).connect(rumble);
  for (const pitch of [55, 82.6]) {
    const tone = context.createOscillator();
    tone.type = "sawtooth";
    tone.frequency.value = pitch;
    tone.connect(drone);
    tone.start();
  }

  // A slow swell, so the engines never sound like a held note.
  const swell = context.createOscillator();
  swell.frequency.value = 0.11;
  const swellDepth = context.createGain();
  swellDepth.gain.value = 0.035;
  swell.connect(swellDepth).connect(rumble.gain);
  swell.start();

  // Air moving in the cabin.
  const hiss = context.createBiquadFilter();
  hiss.type = "bandpass";
  hiss.frequency.value = 1100;
  hiss.Q.value = 0.35;
  const hissLevel = context.createGain();
  hissLevel.gain.value = 0.05;
  noise.connect(hiss).connect(hissLevel).connect(master);

  noise.start();
  return { context, master, rumble, filters };
}

/**
 * Starts or resumes the sound. Browsers only allow this after a tap. True
 * when sound is available.
 */
export function startSound(): boolean {
  if (stopping) {
    clearTimeout(stopping);
    stopping = null;
  }
  engine ??= build();
  if (!engine) return false;
  const { context, master } = engine;
  void context.resume();
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(MASTER, context.currentTime, 0.5);
  return true;
}

/** Sets how hard the engines are working, from 0 to 1. */
export function setEnginePower(power: number) {
  if (!engine) return;
  const { context, rumble, filters } = engine;
  const now = context.currentTime;
  rumble.gain.setTargetAtTime(0.3 + 0.7 * power, now, 1.2);
  for (const filter of filters) {
    filter.frequency.setTargetAtTime(170 + 560 * power * power, now, 1.2);
  }
}

/** Quiet while the flight is paused. `startSound` brings it back. */
export function pauseSound() {
  if (!engine) return;
  const { context, master } = engine;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(0, context.currentTime, 0.15);
  if (stopping) clearTimeout(stopping);
  stopping = setTimeout(() => void engine?.context.suspend(), 900);
}

/** Fades the sound out over a number of seconds and lets it go. */
export function stopSound(fadeSeconds: number) {
  if (!engine) return;
  const ending = engine;
  const { context, master } = ending;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(0, context.currentTime, fadeSeconds / 4 + 0.01);
  if (stopping) clearTimeout(stopping);
  stopping = setTimeout(
    () => {
      void ending.context.close();
      if (engine === ending) engine = null;
      stopping = null;
    },
    fadeSeconds * 1000 + 200
  );
}

/**
 * A two-tone chime: the attendant call in the cabin, or a slower pair of
 * notes for the landing.
 */
export function playChime(kind: "cabin" | "landing") {
  if (!engine) return;
  const { context } = engine;
  const notes =
    kind === "cabin"
      ? [
          { pitch: 659.3, at: 0 },
          { pitch: 523.3, at: 0.55 },
        ]
      : [
          { pitch: 523.3, at: 0 },
          { pitch: 659.3, at: 0.7 },
          { pitch: 784, at: 1.4 },
        ];
  for (const note of notes) {
    const start = context.currentTime + 0.05 + note.at;
    const level = context.createGain();
    level.gain.setValueAtTime(0, start);
    level.gain.linearRampToValueAtTime(0.16, start + 0.015);
    level.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);
    // Straight to the speakers, so it rings on as the engines fade.
    level.connect(context.destination);
    for (const [multiple, share] of [
      [1, 1],
      [2, 0.18],
    ]) {
      const tone = context.createOscillator();
      tone.type = "sine";
      tone.frequency.value = note.pitch * multiple;
      const part = context.createGain();
      part.gain.value = share;
      tone.connect(part).connect(level);
      tone.start(start);
      tone.stop(start + 1.9);
    }
  }
}
