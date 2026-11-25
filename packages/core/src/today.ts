/**
 * The heading shown at the top of Today, e.g. "Tuesday, November 24".
 * Lives in the shared package so every screen formats the date the same way.
 */
export function formatTodayHeading(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
