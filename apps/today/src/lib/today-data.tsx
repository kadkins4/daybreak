import {
  currentStreak,
  isDone,
  mergePending,
  type DayKey,
  type Habit,
  type HabitType,
} from "@today/core";
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

import { readJson, writeJson } from "./storage";
import { supabase } from "./supabase";

interface HabitRow {
  id: string;
  name: string;
  short_name: string | null;
  type: HabitType;
  daily_number: number;
  position: number;
  archived: boolean;
}

interface EntryRow {
  habit_id: string;
  day: DayKey;
  count: number;
}

/** A changed count that has not reached the backend yet. */
interface PendingEntry {
  habitId: string;
  day: DayKey;
  /** What this screen shows now. */
  count: number;
  /** What the backend held when the first of these taps was made. */
  base?: number;
}

type Counts = Record<string, number>;
type Outbox = Record<string, PendingEntry>;

export interface HabitInput {
  name: string;
  shortName: string | null;
  type: HabitType;
  dailyNumber: number;
}

export interface TodayData {
  status: "loading" | "ready" | "error";
  /** Active Habits in their chosen order. */
  habits: Habit[];
  archivedHabits: Habit[];
  countFor: (habitId: string, day: DayKey) => number;
  streakFor: (habit: Habit, today: DayKey) => number;
  /** Set a day's count. Shows at once, and is sent when there is a connection. */
  setCount: (habitId: string, day: DayKey, count: number) => void;
  /** How many changes are waiting for a connection. Zero while online. */
  waiting: number;
  addHabit: (input: HabitInput) => Promise<string | null>;
  updateHabit: (
    id: string,
    input: Partial<HabitInput>
  ) => Promise<string | null>;
  moveHabit: (id: string, direction: -1 | 1) => Promise<void>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
}

export const TodayDataContext = createContext<TodayData | null>(null);

const entryKey = (habitId: string, day: DayKey) => `${habitId}|${day}`;

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    type: row.type,
    dailyNumber: row.daily_number,
    position: row.position,
    archived: row.archived,
  };
}

const HABIT_COLUMNS =
  "id, name, short_name, type, daily_number, position, archived";
const PAGE = 1000;

async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .order("position");
  if (error) throw error;
  return (data as HabitRow[]).map(toHabit);
}

async function fetchCounts(): Promise<Counts> {
  const counts: Counts = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("habit_entries")
      .select("habit_id, day, count")
      .order("day", { ascending: false })
      .order("habit_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data as EntryRow[]) {
      counts[entryKey(row.habit_id, row.day)] = row.count;
    }
    if (data.length < PAGE) return counts;
  }
}

export function TodayDataProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<TodayData["status"]>("loading");
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [outbox, setOutboxState] = useState<Outbox>({});

  // True after a send has failed, until one succeeds.
  const [offline, setOffline] = useState(false);

  const outboxRef = useRef<Outbox>({});
  const countsRef = useRef<Counts>({});
  countsRef.current = counts;
  const sending = useRef(false);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasData = useRef(false);

  const snapshotKey = `today.snapshot.${userId}`;
  const outboxKey = `today.outbox.${userId}`;

  const setOutbox = useCallback(
    (next: Outbox) => {
      outboxRef.current = next;
      setOutboxState(next);
      void writeJson(outboxKey, next);
    },
    [outboxKey]
  );

  const send = useCallback(async () => {
    if (sending.current) return;
    const batch = Object.values(outboxRef.current);
    if (batch.length === 0) return;
    sending.current = true;

    const fail = () => {
      // No connection, most likely. Keep the taps and try again shortly.
      sending.current = false;
      setOffline(true);
      if (retry.current) clearTimeout(retry.current);
      retry.current = setTimeout(() => void send(), 5000);
    };

    // Read what the backend holds now, so these taps are added on top of
    // anything another screen saved in the meantime.
    const current = await supabase
      .from("habit_entries")
      .select("habit_id, day, count")
      .in("habit_id", [...new Set(batch.map((entry) => entry.habitId))])
      .in("day", [...new Set(batch.map((entry) => entry.day))]);
    if (current.error) return fail();
    const saved: Counts = {};
    for (const row of current.data as EntryRow[]) {
      saved[entryKey(row.habit_id, row.day)] = row.count;
    }

    const toSave: PendingEntry[] = [];
    const settled: Counts = {};
    const pending = { ...outboxRef.current };
    for (const { habitId, day } of batch) {
      const key = entryKey(habitId, day);
      const entry = pending[key];
      const held = saved[key] ?? 0;
      const count =
        entry.base === undefined
          ? entry.count
          : mergePending({ base: entry.base, count: entry.count }, held);
      if (count === null) {
        // Already there, from an earlier try whose answer never arrived.
        settled[key] = held;
        delete pending[key];
        continue;
      }
      // Remember what is being sent before sending it, so a retry after a
      // lost answer does not add the same taps twice.
      pending[key] = { habitId, day, count, base: held };
      toSave.push(pending[key]);
    }
    setOutbox(pending);

    if (toSave.length > 0) {
      const { error } = await supabase.from("habit_entries").upsert(
        toSave.map((entry) => ({
          habit_id: entry.habitId,
          day: entry.day,
          count: entry.count,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "habit_id,day" }
      );
      if (error) return fail();
    }
    sending.current = false;
    setOffline(false);
    if (retry.current) clearTimeout(retry.current);

    const remaining = { ...outboxRef.current };
    for (const entry of toSave) {
      const key = entryKey(entry.habitId, entry.day);
      settled[key] = entry.count;
      const latest = remaining[key];
      if (!latest) continue;
      if (latest.count === entry.count) delete remaining[key];
      // Tapped again while sending: only the new taps are still pending.
      else remaining[key] = { ...latest, base: entry.count };
    }
    setCounts((counts) => ({ ...counts, ...settled }));
    setOutbox(remaining);
    if (Object.keys(remaining).length > 0) void send();
  }, [setOutbox]);

  const refresh = useCallback(async () => {
    try {
      const [habits, fresh] = await Promise.all([fetchHabits(), fetchCounts()]);
      setAllHabits(habits);
      setCounts(fresh);
      hasData.current = true;
      setStatus("ready");
    } catch {
      // Offline with a saved copy is fine. Offline with nothing is an error.
      if (!hasData.current) setStatus("error");
    }
  }, []);

  // Start from the saved copy, then load the real thing and send saved taps.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [snapshot, saved] = await Promise.all([
        readJson<{ habits: Habit[]; counts: Counts }>(snapshotKey),
        readJson<Outbox>(outboxKey),
      ]);
      if (cancelled) return;
      if (saved) {
        outboxRef.current = saved;
        setOutboxState(saved);
      }
      if (snapshot) {
        setAllHabits(snapshot.habits);
        setCounts(snapshot.counts);
        hasData.current = true;
        setStatus("ready");
      }
      await refresh();
      void send();
    })();
    return () => {
      cancelled = true;
      if (retry.current) clearTimeout(retry.current);
    };
  }, [snapshotKey, outboxKey, refresh, send]);

  useEffect(() => {
    if (status === "ready") {
      void writeJson(snapshotKey, { habits: allHabits, counts });
    }
  }, [status, allHabits, counts, snapshotKey]);

  // Live sync: changes made on another screen arrive here.
  useEffect(() => {
    let subscribedBefore = false;
    const channel = supabase
      .channel(`today-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_entries" },
        (payload) => {
          const removed = payload.eventType === "DELETE";
          const row = (removed ? payload.old : payload.new) as EntryRow;
          if (!row?.habit_id || !row.day) return;
          setCounts((current) => ({
            ...current,
            [entryKey(row.habit_id, row.day)]: removed ? 0 : row.count,
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits" },
        () => {
          fetchHabits().then(setAllHabits, () => {});
        }
      )
      .subscribe((state) => {
        if (state !== "SUBSCRIBED") return;
        // After a dropped connection, catch up on anything missed.
        if (subscribedBefore) void refresh();
        subscribedBefore = true;
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // When the connection or the page comes back, send and catch up.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const wake = () => {
      void send();
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") wake();
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [send, refresh]);

  const merged = useMemo(() => {
    const next = { ...counts };
    for (const [key, entry] of Object.entries(outbox)) next[key] = entry.count;
    return next;
  }, [counts, outbox]);

  const doneDays = useMemo(() => {
    const byId = new Map(allHabits.map((habit) => [habit.id, habit]));
    const done = new Map<string, Set<DayKey>>();
    for (const [key, count] of Object.entries(merged)) {
      const [habitId, day] = key.split("|");
      const habit = byId.get(habitId);
      if (!habit || !isDone(habit, count)) continue;
      if (!done.has(habitId)) done.set(habitId, new Set());
      done.get(habitId)!.add(day);
    }
    return done;
  }, [allHabits, merged]);

  const value = useMemo<TodayData>(() => {
    const active = allHabits
      .filter((habit) => !habit.archived)
      .sort((a, b) => a.position - b.position);

    const save = async (
      change: PromiseLike<{ error: { message: string } | null }>
    ) => {
      const { error } = await change;
      if (error) return error.message;
      setAllHabits(await fetchHabits());
      return null;
    };

    return {
      status,
      habits: active,
      archivedHabits: allHabits.filter((habit) => habit.archived),
      countFor: (habitId, day) => merged[entryKey(habitId, day)] ?? 0,
      streakFor: (habit, today) =>
        currentStreak(doneDays.get(habit.id) ?? [], today),
      setCount(habitId, day, count) {
        const key = entryKey(habitId, day);
        const base =
          outboxRef.current[key]?.base ?? countsRef.current[key] ?? 0;
        setOutbox({
          ...outboxRef.current,
          [key]: { habitId, day, count, base },
        });
        void send();
      },
      waiting: offline ? Object.keys(outbox).length : 0,
      addHabit(input) {
        const last = Math.max(-1, ...allHabits.map((habit) => habit.position));
        return save(
          supabase.from("habits").insert({
            name: input.name.trim(),
            short_name: input.shortName?.trim() || null,
            type: input.type,
            daily_number: input.type === "complete" ? 1 : input.dailyNumber,
            position: last + 1,
          })
        );
      },
      updateHabit(id, input) {
        const patch: Partial<HabitRow> = {};
        if (input.name !== undefined) patch.name = input.name.trim();
        if (input.shortName !== undefined) {
          patch.short_name = input.shortName?.trim() || null;
        }
        if (input.dailyNumber !== undefined) {
          patch.daily_number = input.dailyNumber;
        }
        return save(supabase.from("habits").update(patch).eq("id", id));
      },
      async moveHabit(id, direction) {
        const index = active.findIndex((habit) => habit.id === id);
        const other = active[index + direction];
        if (index < 0 || !other) return;
        const moved = active[index];
        // Show the new order at once, then save both rows.
        setAllHabits((current) =>
          current.map((habit) => {
            if (habit.id === moved.id) {
              return { ...habit, position: other.position };
            }
            if (habit.id === other.id) {
              return { ...habit, position: moved.position };
            }
            return habit;
          })
        );
        await Promise.all([
          supabase
            .from("habits")
            .update({ position: other.position })
            .eq("id", moved.id),
          supabase
            .from("habits")
            .update({ position: moved.position })
            .eq("id", other.id),
        ]);
        fetchHabits().then(setAllHabits, () => {});
      },
      async setArchived(id, archived) {
        const last = Math.max(-1, ...allHabits.map((habit) => habit.position));
        // A restored Habit goes to the end of the list.
        const patch = archived
          ? { archived }
          : { archived, position: last + 1 };
        await save(supabase.from("habits").update(patch).eq("id", id));
      },
    };
  }, [status, allHabits, merged, doneDays, outbox, offline, setOutbox, send]);

  return (
    <TodayDataContext.Provider value={value}>
      {children}
    </TodayDataContext.Provider>
  );
}

export function useTodayData(): TodayData {
  const value = useContext(TodayDataContext);
  if (!value)
    throw new Error("useTodayData must be used inside TodayDataProvider");
  return value;
}
