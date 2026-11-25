// The day's weather for one place, from Open-Meteo, saved for the day.
//
// Send { date, latitude?, longitude? }. Without coordinates it uses the
// fallback location from Settings (San Diego unless changed).
//
// Open-Meteo's free tier is for non-commercial use only (see docs/later.md).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const minutesOf = (timestamp: string) => {
  const [hours, minutes] = timestamp.slice(11, 16).split(":").map(Number);
  return hours * 60 + minutes;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The nearest town or city, or null when the lookup fails. */
async function placeName(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10" +
      `&lat=${latitude}&lon=${longitude}&accept-language=en`;
    const response = await fetch(url, {
      headers: { "User-Agent": "the-hub personal project" },
    });
    if (!response.ok) return null;
    const { address } = await response.json();
    return (
      address?.city ??
      address?.town ??
      address?.village ??
      address?.municipality ??
      address?.county ??
      null
    );
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return reply({ error: "Sign in first" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    request.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
  );
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return reply({ error: "Sign in first" }, 401);

  const body = await request.json().catch(() => ({}));
  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reply({ error: "date must be YYYY-MM-DD" }, 400);
  }

  let latitude = Number(body.latitude);
  let longitude = Number(body.longitude);
  let place: string | null = null;
  const shared =
    body.latitude != null &&
    body.longitude != null &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  if (!shared) {
    const { data: settings } = await supabase
      .from("settings")
      .select("fallback_place, fallback_latitude, fallback_longitude")
      .maybeSingle();
    latitude = settings?.fallback_latitude ?? 32.7157;
    longitude = settings?.fallback_longitude ?? -117.1611;
    place = settings?.fallback_place ?? "San Diego";
  }
  // Two decimals is about a kilometre: close enough for weather, and it
  // keeps her exact position out of the cache and out of the lookups.
  latitude = round2(latitude);
  longitude = round2(longitude);

  const { data: saved } = await supabase
    .from("weather_cache")
    .select("payload")
    .eq("date", date)
    .eq("latitude", latitude)
    .eq("longitude", longitude)
    .maybeSingle();
  // Weather saved before the time zone was recorded is fetched again.
  if (saved?.payload?.utcOffsetSeconds !== undefined)
    return reply(saved.payload);

  const forecast = await fetch(
    "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${latitude}&longitude=${longitude}` +
      "&hourly=temperature_2m,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset" +
      "&temperature_unit=fahrenheit&timezone=auto" +
      `&start_date=${date}&end_date=${date}`
  );
  if (!forecast.ok) return reply({ error: "Weather is unavailable" }, 502);
  const { hourly, daily, utc_offset_seconds } = await forecast.json();

  const payload = {
    date,
    place: place ?? (await placeName(latitude, longitude)) ?? "your area",
    sunrise: minutesOf(daily.sunrise[0]),
    sunset: minutesOf(daily.sunset[0]),
    high: Math.round(daily.temperature_2m_max[0]),
    low: Math.round(daily.temperature_2m_min[0]),
    hourlyTemperature: hourly.temperature_2m.slice(0, 24),
    hourlyCode: hourly.weather_code.slice(0, 24),
    utcOffsetSeconds: utc_offset_seconds,
  };

  await supabase
    .from("weather_cache")
    .upsert({ date, latitude, longitude, payload });
  // Keep the cache small: a week is plenty for stepping back a few days.
  const weekAgo = new Date(Date.parse(date) - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await supabase.from("weather_cache").delete().lt("date", weekAgo);

  return reply(payload);
});
