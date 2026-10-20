// Weekly business hours of a queue. weekday follows Date#getDay():
// 0 = Sunday ... 6 = Saturday. Times are "HH:mm" in the company time zone.
export interface QueueSchedule {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

// Weekday and minutes since midnight of `date` in the given time zone.
export const getLocalTime = (
  date: Date,
  timezone: string
): { weekday: number; minutes: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const get = (type: string) => parts.find(part => part.type === type)?.value;

  return {
    weekday: WEEKDAYS[get("weekday") as string],
    minutes: Number(get("hour")) * 60 + Number(get("minute"))
  };
};

export const isValidSchedule = (schedules: unknown): boolean =>
  Array.isArray(schedules) &&
  schedules.every(
    item =>
      item &&
      Number.isInteger(item.weekday) &&
      item.weekday >= 0 &&
      item.weekday <= 6 &&
      typeof item.enabled === "boolean" &&
      (!item.enabled ||
        (TIME_PATTERN.test(item.start) && TIME_PATTERN.test(item.end)))
  );

export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

// A queue without schedules is always open. A day that is missing or
// disabled is closed. An end earlier than the start crosses midnight.
export const isWithinBusinessHours = (
  schedules: QueueSchedule[],
  timezone: string,
  date: Date = new Date()
): boolean => {
  if (!schedules || schedules.length === 0) return true;

  const { weekday, minutes } = getLocalTime(date, timezone);
  const previousWeekday = (weekday + 6) % 7;

  const isOpenOn = (
    day: number,
    check: (start: number, end: number) => boolean
  ) => {
    const schedule = schedules.find(item => item.weekday === day);
    if (!schedule || !schedule.enabled) return false;
    return check(toMinutes(schedule.start), toMinutes(schedule.end));
  };

  const openToday = isOpenOn(
    weekday,
    (start, end) =>
      end > start ? minutes >= start && minutes < end : minutes >= start // overnight: from start until midnight
  );

  // Overnight shift that started yesterday and has not ended yet.
  const openFromYesterday = isOpenOn(
    previousWeekday,
    (start, end) => end <= start && minutes < end
  );

  return openToday || openFromYesterday;
};
