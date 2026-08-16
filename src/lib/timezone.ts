export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";
export const TIMEZONE_COOKIE = "tz";

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUTC - date.getTime()) / 60000;
}

/** Local calendar-day key (YYYY-MM-DD) for a given instant, in a given IANA timezone. */
export function zonedDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** UTC instant range [start, end] covering a local calendar day (YYYY-MM-DD) in a given timezone. */
export function zonedDayRangeFromKey(
  dateKey: string,
  timeZone: string,
): { start: Date; end: Date; dateKey: string } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const localMidnightAsUTC = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const offsetMinutes = tzOffsetMinutes(new Date(localMidnightAsUTC), timeZone);
  const start = new Date(localMidnightAsUTC - offsetMinutes * 60000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end, dateKey };
}

/** UTC instant range covering "today" (as of `reference`) in a given timezone. */
export function zonedDayRange(
  timeZone: string,
  reference: Date = new Date(),
): { start: Date; end: Date; dateKey: string } {
  return zonedDayRangeFromKey(zonedDateKey(reference, timeZone), timeZone);
}
