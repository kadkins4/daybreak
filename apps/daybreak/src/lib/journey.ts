import { airportFor, nearestAirport, type Airport } from "@daybreak/core";
import { useCallback, useEffect, useState } from "react";

import { useSession } from "./session";
import { readJson, writeJson } from "./storage";
import { supabase } from "./supabase";
import { currentPosition } from "./weather";

const SAVED = "daybreak.currentAirport";

export interface CurrentAirport {
  /**
   * "loading" while it is being found, "ready" when there is one, and
   * "pick" when it has to be chosen by hand.
   */
  status: "loading" | "ready" | "pick";
  airport: Airport | null;
  /** Move to another airport by hand. */
  choose: (airport: Airport) => void;
}

/**
 * The Current Airport: where the next Journey takes off. The first time, it
 * is the airport nearest to where he really is.
 */
export function useCurrentAirport(): CurrentAirport {
  const { session } = useSession();
  const userId = session?.user.id;
  const [status, setStatus] = useState<CurrentAirport["status"]>("loading");
  const [airport, setAirport] = useState<Airport | null>(null);

  const save = useCallback(
    (next: Airport) => {
      setAirport(next);
      setStatus("ready");
      void writeJson(SAVED, next.code);
      if (!userId) return;
      void supabase
        .from("settings")
        .upsert(
          { user_id: userId, current_airport: next.code },
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (error) console.warn("Could not save the Current Airport", error);
        });
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    const show = (code: string | null | undefined) => {
      const found = code ? airportFor(code) : undefined;
      if (!found || cancelled) return false;
      setAirport(found);
      setStatus("ready");
      return true;
    };

    (async () => {
      // What this screen last knew, so the map opens at once.
      const shown = show(await readJson<string>(SAVED));
      const { data, error } = await supabase
        .from("settings")
        .select("current_airport")
        .maybeSingle();
      if (cancelled) return;
      if (show(data?.current_airport)) {
        void writeJson(SAVED, data?.current_airport);
        return;
      }
      // Offline, or the lookup failed: keep what this screen last knew.
      if (error && shown) return;
      const position = await currentPosition();
      if (cancelled) return;
      if (position) save(nearestAirport(position));
      else if (!shown) setStatus("pick");
    })();

    return () => {
      cancelled = true;
    };
  }, [save]);

  return { status, airport, choose: save };
}
