import {
  airportFor,
  deviceTimeZone,
  diversionAt,
  journeyTotals,
  milesFlownAt,
  nearestAirport,
  pausedPastRollover,
  secondsFlownAt,
  touchdownTime,
  type Airport,
  type FlightClock,
  type FlightPlan,
  type Place,
} from "@daybreak/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";

import { flightNow } from "./clock";
import {
  enginePower,
  pauseSound,
  playChime,
  setEnginePower,
  startSound,
  stopSound,
} from "./flightSound";
import { readJson, writeJson } from "./storage";
import { supabase } from "./supabase";
import { currentPosition } from "./weather";

/** One Journey, as every screen sees it. Times are in milliseconds. */
export interface Journey extends FlightClock {
  id: string;
  origin: string;
  /** Null for a Round Trip. */
  destination: string | null;
  outboundHeading: number | null;
  plannedMiles: number;
  focus: string | null;
  tookOffAt: number;
  pausedAt: number | null;
  endedAt: number | null;
  /** The airport it came down at. Null while it is in the air. */
  landedAt: string | null;
  milesEarned: number | null;
  /** Where he really was at takeoff, when the screen shared it. */
  takeoff: Place | null;
}

/** Where Journeys and the Current Airport are kept. */
export interface JourneyStore {
  /** Every Journey, newest first. */
  list: () => Promise<Journey[]>;
  add: (journey: Journey) => Promise<void>;
  /** Changes a Journey, but only while it is in one of these statuses. */
  change: (
    id: string,
    patch: Partial<Journey>,
    onlyWhile: Journey["status"][]
  ) => Promise<void>;
  currentAirport: () => Promise<string | null>;
  setCurrentAirport: (code: string) => Promise<void>;
  /** Calls back when another screen changes a Journey. */
  watch: (onChange: () => void) => () => void;
}

interface Row {
  id: string;
  origin: string;
  destination: string | null;
  outbound_heading: number | null;
  planned_seconds: number;
  planned_miles: number;
  focus: string | null;
  status: Journey["status"];
  took_off_at: string;
  flown_seconds: number;
  resumed_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  landed_at: string | null;
  miles_earned: number | null;
  takeoff_latitude: number | null;
  takeoff_longitude: number | null;
}

const time = (value: string | null) => (value ? Date.parse(value) : null);
const stamp = (value: number | null | undefined) =>
  value == null ? null : new Date(value).toISOString();

function fromRow(row: Row): Journey {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    outboundHeading: row.outbound_heading,
    plannedSeconds: row.planned_seconds,
    plannedMiles: row.planned_miles,
    focus: row.focus,
    status: row.status,
    tookOffAt: Date.parse(row.took_off_at),
    flownSeconds: row.flown_seconds,
    resumedAt: time(row.resumed_at),
    pausedAt: time(row.paused_at),
    endedAt: time(row.ended_at),
    landedAt: row.landed_at,
    milesEarned: row.miles_earned,
    takeoff:
      row.takeoff_latitude !== null && row.takeoff_longitude !== null
        ? { latitude: row.takeoff_latitude, longitude: row.takeoff_longitude }
        : null,
  };
}

/** Only the columns that are being changed. */
function toRow(journey: Partial<Journey>): Partial<Row> {
  const row: Partial<Row> = {};
  if ("id" in journey) row.id = journey.id;
  if ("origin" in journey) row.origin = journey.origin;
  if ("destination" in journey) row.destination = journey.destination;
  if ("outboundHeading" in journey) {
    row.outbound_heading = journey.outboundHeading;
  }
  if ("plannedSeconds" in journey) row.planned_seconds = journey.plannedSeconds;
  if ("plannedMiles" in journey) row.planned_miles = journey.plannedMiles;
  if ("focus" in journey) row.focus = journey.focus;
  if ("status" in journey) row.status = journey.status;
  if (journey.tookOffAt !== undefined) {
    row.took_off_at = new Date(journey.tookOffAt).toISOString();
  }
  if (journey.flownSeconds !== undefined) {
    row.flown_seconds = Math.round(journey.flownSeconds);
  }
  if ("resumedAt" in journey) row.resumed_at = stamp(journey.resumedAt);
  if ("pausedAt" in journey) row.paused_at = stamp(journey.pausedAt);
  if ("endedAt" in journey) row.ended_at = stamp(journey.endedAt);
  if ("landedAt" in journey) row.landed_at = journey.landedAt;
  if ("milesEarned" in journey) row.miles_earned = journey.milesEarned;
  if ("takeoff" in journey) {
    row.takeoff_latitude = journey.takeoff?.latitude ?? null;
    row.takeoff_longitude = journey.takeoff?.longitude ?? null;
  }
  return row;
}

const COLUMNS =
  "id, origin, destination, outbound_heading, planned_seconds, " +
  "planned_miles, focus, status, took_off_at, flown_seconds, resumed_at, " +
  "paused_at, ended_at, landed_at, miles_earned, takeoff_latitude, " +
  "takeoff_longitude";

/** Journeys in the database, shared by every screen he is signed in on. */
export function databaseStore(userId: string): JourneyStore {
  return {
    async list() {
      const { data, error } = await supabase
        .from("journeys")
        .select(COLUMNS)
        .order("took_off_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Row[]).map(fromRow);
    },
    async add(journey) {
      const { error } = await supabase
        .from("journeys")
        .insert({ ...toRow(journey), user_id: userId });
      if (error) throw error;
    },
    async change(id, patch, onlyWhile) {
      const { error } = await supabase
        .from("journeys")
        .update(toRow(patch))
        .eq("id", id)
        .in("status", onlyWhile);
      if (error) throw error;
    },
    async currentAirport() {
      const { data, error } = await supabase
        .from("settings")
        .select("current_airport")
        .maybeSingle();
      if (error) throw error;
      return data?.current_airport ?? null;
    },
    async setCurrentAirport(code) {
      const { error } = await supabase
        .from("settings")
        .upsert(
          { user_id: userId, current_airport: code },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    watch(onChange) {
      let subscribedBefore = false;
      const channel = supabase
        .channel(`journeys-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "journeys" },
          onChange
        )
        .subscribe((state) => {
          if (state !== "SUBSCRIBED") return;
          // After a dropped connection, catch up on anything missed.
          if (subscribedBefore) onChange();
          subscribedBefore = true;
        });
      return () => {
        void supabase.removeChannel(channel);
      };
    },
  };
}

/** What a new Journey needs to take off. */
export interface Takeoff {
  plan: FlightPlan;
  focus: string;
  /** Where he really is, when the screen knows. */
  position: Place | null;
}

interface Journeys {
  /** False until the Journeys have been read at least once. */
  ready: boolean;
  /** The Journey in the air or paused, if there is one. */
  active: Journey | null;
  /** A Journey that has ended and whose summary has not been seen here. */
  summary: Journey | null;
  /** The newest Journey of all, in any status. */
  latest: Journey | null;
  totals: { miles: number; airports: number };
  /** Headings of the most recent Round Trips, newest first. */
  recentHeadings: number[];
  takeOff: (takeoff: Takeoff) => void;
  pause: () => void;
  resume: () => void;
  /** Ends the flight now, by the Diversion rule. */
  endEarly: () => void;
  dismissSummary: () => void;
  /** True while this screen is playing the flight's sound. */
  soundOn: boolean;
  toggleSound: () => void;
  airportStatus: "idle" | "loading" | "ready" | "pick";
  airport: Airport | null;
  chooseAirport: (airport: Airport) => void;
  /** Starts finding the Current Airport, if that has not begun. */
  findAirport: () => void;
}

const JourneyContext = createContext<Journeys | null>(null);

const SAVED_AIRPORT = "daybreak.currentAirport";
const SEEN = "daybreak.journey.seen";
const MUTED = "daybreak.journey.muted";
/** A summary is only worth showing for this long after the landing. */
const SUMMARY_HOURS = 18;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The plan a saved Journey is flying, or null if its airports are gone. */
export function planOf(journey: Journey): FlightPlan | null {
  const origin = airportFor(journey.origin);
  const destination = journey.destination
    ? airportFor(journey.destination)
    : null;
  if (!origin || destination === undefined) return null;
  return {
    origin,
    destination,
    outboundHeading: journey.outboundHeading,
    plannedSeconds: journey.plannedSeconds,
    plannedMiles: journey.plannedMiles,
  };
}

const inProgress = (journey: Journey) =>
  journey.status === "flying" || journey.status === "paused";

/**
 * Journeys for the whole app: the one in the air, the totals, the Current
 * Airport and the flight's sound. Every screen reads the same rows, and
 * time left is worked out from them, so nothing ticks in the database.
 */
export function JourneyProvider({
  store,
  cacheKey,
  children,
}: {
  store: JourneyStore;
  /** Names this user's saved copy on this screen. */
  cacheKey: string;
  children: ReactNode;
}) {
  const [journeys, setJourneysState] = useState<Journey[]>([]);
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  const [airportStatus, setAirportStatus] =
    useState<Journeys["airportStatus"]>("idle");
  const [airport, setAirport] = useState<Airport | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const journeysRef = useRef<Journey[]>([]);
  const savedMuted = useRef(false);
  const saved = `daybreak.journeys.${cacheKey}`;

  const setJourneys = useCallback(
    (next: Journey[]) => {
      journeysRef.current = next;
      setJourneysState(next);
      void writeJson(saved, next);
    },
    [saved]
  );

  const showAirport = useCallback((code: string | null | undefined) => {
    const found = code ? airportFor(code) : undefined;
    if (!found) return false;
    setAirport(found);
    setAirportStatus("ready");
    void writeJson(SAVED_AIRPORT, found.code);
    return true;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [list, code] = await Promise.all([
        store.list(),
        store.currentAirport(),
      ]);
      setJourneys(list);
      showAirport(code);
    } catch (error) {
      console.warn("Could not read Journeys", error);
    } finally {
      // Offline, the picker still opens with what this screen last knew.
      setReady(true);
    }
  }, [store, setJourneys, showAirport]);

  // What this screen last knew, then the truth, then live changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, lastSeen, muted] = await Promise.all([
        readJson<Journey[]>(saved),
        readJson<string>(SEEN),
        readJson<boolean>(MUTED),
      ]);
      if (cancelled) return;
      savedMuted.current = muted === true;
      setSeen(lastSeen);
      if (list && journeysRef.current.length === 0) {
        journeysRef.current = list;
        setJourneysState(list);
        setReady(true);
      }
      void refresh();
    })();
    const stop = store.watch(() => void refresh());
    const onShow = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    if (Platform.OS === "web") {
      document.addEventListener("visibilitychange", onShow);
    }
    return () => {
      cancelled = true;
      stop();
      if (Platform.OS === "web") {
        document.removeEventListener("visibilitychange", onShow);
      }
    };
  }, [store, saved, refresh]);

  /** Changes one Journey here at once, then in the store. */
  const apply = useCallback(
    (id: string, patch: Partial<Journey>, onlyWhile: Journey["status"][]) => {
      setJourneys(
        journeysRef.current.map((journey) =>
          journey.id === id && onlyWhile.includes(journey.status)
            ? { ...journey, ...patch }
            : journey
        )
      );
      store.change(id, patch, onlyWhile).catch((error) => {
        console.warn("Could not save the Journey", error);
        void refresh();
      });
    },
    [store, setJourneys, refresh]
  );

  const moveTo = useCallback(
    (next: Airport) => {
      showAirport(next.code);
      return store.setCurrentAirport(next.code).catch((error) => {
        console.warn("Could not save the Current Airport", error);
      });
    },
    [store, showAirport]
  );

  /** Ends a Journey: where it came down and what it earned. */
  const ending = useRef(new Set<string>());
  const end = useCallback(
    (
      journey: Journey,
      status: "landed" | "diverted",
      at: number,
      landing: { airport: Airport; miles: number },
      flownSeconds: number
    ) => {
      if (ending.current.has(journey.id)) return;
      ending.current.add(journey.id);
      // The airport first, so a screen that hears about the landing finds
      // the Current Airport already moved.
      void moveTo(landing.airport).then(() =>
        apply(
          journey.id,
          {
            status,
            endedAt: at,
            resumedAt: null,
            pausedAt: null,
            flownSeconds,
            landedAt: landing.airport.code,
            milesEarned: landing.miles,
          },
          ["flying", "paused"]
        )
      );
    },
    [apply, moveTo]
  );

  const active = useMemo(() => journeys.find(inProgress) ?? null, [journeys]);

  const divert = useCallback(
    (journey: Journey) => {
      const plan = planOf(journey);
      if (!plan) return;
      const now = flightNow();
      const flown = secondsFlownAt(journey, now);
      end(
        journey,
        "diverted",
        now,
        diversionAt(plan, milesFlownAt(flown, plan)),
        flown
      );
    },
    [end]
  );

  // Landing is automatic: at touchdown, or as soon as a screen opens after
  // it. A Journey left paused is ended once the day rolls over.
  useEffect(() => {
    if (!active) return;
    const plan = planOf(active);
    if (!plan) return;
    if (active.status === "paused") {
      const check = () => {
        if (
          active.pausedAt !== null &&
          pausedPastRollover(
            new Date(active.pausedAt),
            new Date(),
            deviceTimeZone()
          )
        ) {
          divert(active);
        }
      };
      check();
      const timer = setInterval(check, 60_000);
      return () => clearInterval(timer);
    }
    const touchdown = touchdownTime(active);
    if (touchdown === null) return;
    const land = () =>
      end(
        active,
        "landed",
        touchdown,
        {
          airport: plan.destination ?? plan.origin,
          miles: plan.plannedMiles,
        },
        plan.plannedSeconds
      );
    const wait = touchdown - flightNow();
    if (wait <= 0) {
      land();
      return;
    }
    // Check often rather than trust one long timer: a sleeping screen or a
    // sped-up test clock would both throw a single timer off.
    const timer = setInterval(() => {
      if (flightNow() >= touchdown) land();
    }, 500);
    return () => clearInterval(timer);
  }, [active, end, divert]);

  // The flight's sound follows the flight on this screen.
  const activeId = active?.id ?? null;
  const flying = active?.status === "flying";
  const activeRef = useRef(active);
  activeRef.current = active;
  const hadFlight = useRef<string | null>(null);
  useEffect(() => {
    if (!soundOn) return;
    if (!activeId) {
      // Touchdown, or the flight was ended: a chime, then quiet.
      if (hadFlight.current) playChime("landing");
      hadFlight.current = null;
      stopSound(5);
      setSoundOn(false);
      return;
    }
    hadFlight.current = activeId;
    if (!flying) {
      pauseSound();
      return;
    }
    startSound();
    let nextChime: number | null = null;
    const tick = () => {
      const journey = activeRef.current;
      if (!journey) return;
      const flown = secondsFlownAt(journey, flightNow());
      setEnginePower(enginePower(flown, journey.plannedSeconds));
      // One chime as the climb ends, then one every few minutes.
      if (nextChime === null) {
        nextChime = flown < 50 ? 50 : flown + 240 + Math.random() * 300;
      }
      if (flown >= nextChime && journey.plannedSeconds - flown > 90) {
        playChime("cabin");
        nextChime = flown + 240 + Math.random() * 300;
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [soundOn, activeId, flying]);
  useEffect(() => () => stopSound(0), []);

  const value = useMemo<Journeys>(() => {
    const latest = journeys[0] ?? null;
    const ended = journeys.find((journey) => journey.endedAt !== null) ?? null;
    const summary =
      ended &&
      !active &&
      seen !== undefined &&
      ended.id !== seen &&
      flightNow() - (ended.endedAt ?? 0) < SUMMARY_HOURS * 3_600_000
        ? ended
        : null;
    return {
      ready,
      active,
      summary,
      latest,
      totals: journeyTotals(journeys),
      recentHeadings: journeys
        .filter((journey) => journey.outboundHeading !== null)
        .slice(0, 4)
        .map((journey) => journey.outboundHeading as number),
      takeOff: ({ plan, focus, position }) => {
        if (journeysRef.current.some(inProgress)) return;
        const now = flightNow();
        const journey: Journey = {
          id: newId(),
          origin: plan.origin.code,
          destination: plan.destination?.code ?? null,
          outboundHeading: plan.outboundHeading,
          plannedSeconds: plan.plannedSeconds,
          plannedMiles: plan.plannedMiles,
          focus: focus.trim() || null,
          status: "flying",
          tookOffAt: now,
          flownSeconds: 0,
          resumedAt: now,
          pausedAt: null,
          endedAt: null,
          landedAt: null,
          milesEarned: null,
          takeoff: position,
        };
        setJourneys([journey, ...journeysRef.current]);
        // The punch is a tap, which is what lets a browser start sound.
        if (!savedMuted.current && startSound()) setSoundOn(true);
        store.add(journey).catch((error) => {
          console.warn("Could not save the Journey", error);
          void refresh();
        });
      },
      pause: () => {
        if (active?.status !== "flying") return;
        const now = flightNow();
        apply(
          active.id,
          {
            status: "paused",
            flownSeconds: Math.round(secondsFlownAt(active, now)),
            resumedAt: null,
            pausedAt: now,
          },
          ["flying"]
        );
      },
      resume: () => {
        if (active?.status !== "paused") return;
        apply(
          active.id,
          { status: "flying", resumedAt: flightNow(), pausedAt: null },
          ["paused"]
        );
      },
      endEarly: () => {
        if (active) divert(active);
      },
      dismissSummary: () => {
        if (!summary) return;
        setSeen(summary.id);
        void writeJson(SEEN, summary.id);
      },
      soundOn,
      toggleSound: () => {
        const next = !soundOn;
        savedMuted.current = !next;
        void writeJson(MUTED, !next);
        if (next) setSoundOn(startSound());
        else {
          stopSound(0.4);
          setSoundOn(false);
        }
      },
      airportStatus,
      airport,
      chooseAirport: (next) => void moveTo(next),
      findAirport: () => {
        if (airportStatus !== "idle") return;
        setAirportStatus("loading");
        (async () => {
          // What this screen last knew, so the map opens at once.
          const shown = showAirport(await readJson<string>(SAVED_AIRPORT));
          let code: string | null = null;
          let failed = false;
          try {
            code = await store.currentAirport();
          } catch {
            failed = true;
          }
          if (showAirport(code)) return;
          // Offline, or the lookup failed: keep what this screen last knew.
          if (failed && shown) return;
          const position = await currentPosition();
          if (position) void moveTo(nearestAirport(position));
          else if (!shown) setAirportStatus("pick");
        })();
      },
    };
  }, [
    journeys,
    ready,
    active,
    seen,
    soundOn,
    airportStatus,
    airport,
    store,
    apply,
    divert,
    moveTo,
    refresh,
    setJourneys,
    showAirport,
  ]);

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}

export function useJourneys(): Journeys {
  const value = useContext(JourneyContext);
  if (!value) throw new Error("useJourneys needs a JourneyProvider");
  return value;
}

/**
 * The Current Airport: where the next Journey takes off. The first time, it
 * is the airport nearest to where he really is. After that it is wherever
 * he last landed.
 */
export function useCurrentAirport() {
  const { airportStatus, airport, chooseAirport, findAirport } = useJourneys();
  useEffect(findAirport, [findAirport]);
  return {
    status: airportStatus === "idle" ? ("loading" as const) : airportStatus,
    airport,
    choose: chooseAirport,
  };
}
