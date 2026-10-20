const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Offset (ms) between the time zone and UTC at the given instant.
const offsetAt = (instant: number, timezone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find(part => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - instant;
};

export const isValidDay = (value: string): boolean => DATE_PATTERN.test(value);

// UTC instant of 00:00 of `day` (YYYY-MM-DD) in the time zone.
export const startOfZonedDay = (day: string, timezone: string): Date => {
  const [, year, month, date] = DATE_PATTERN.exec(day) as RegExpExecArray;
  const guess = Date.UTC(Number(year), Number(month) - 1, Number(date));
  // Two passes handle days where the offset changes (DST).
  const first = guess - offsetAt(guess, timezone);
  return new Date(guess - offsetAt(first, timezone));
};

// YYYY-MM-DD of the instant in the time zone.
export const zonedDayKey = (date: Date, timezone: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  return parts;
};

export const zonedToday = (timezone: string): string =>
  zonedDayKey(new Date(), timezone);
