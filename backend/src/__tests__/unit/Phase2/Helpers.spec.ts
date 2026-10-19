import {
  isWithinBusinessHours,
  QueueSchedule
} from "../../../helpers/BusinessHours";
import { startOfZonedDay, zonedDayKey } from "../../../helpers/ZonedDate";
import { isBlockedAddress, safePost } from "../../../helpers/SafeHttpRequest";
import { csvCell } from "../../../services/ReportServices/ExportTicketsCsvService";
import { parseRating } from "../../../services/TicketServices/TicketRatingService";

const weekdays = (start: string, end: string): QueueSchedule[] =>
  [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
    weekday,
    enabled: weekday >= 1 && weekday <= 5,
    start,
    end
  }));

const TZ = "America/Sao_Paulo"; // UTC-3, no daylight saving

describe("business hours", () => {
  const schedule = weekdays("08:00", "18:00");

  it("is open inside the hours of a weekday, in the company time zone", () => {
    // Monday 2026-10-19 10:00 in São Paulo = 13:00 UTC
    expect(
      isWithinBusinessHours(schedule, TZ, new Date("2026-10-19T13:00:00Z"))
    ).toBe(true);
  });

  it("is closed after hours and on days off", () => {
    // Monday 18:30 local
    expect(
      isWithinBusinessHours(schedule, TZ, new Date("2026-10-19T21:30:00Z"))
    ).toBe(false);
    // Sunday 10:00 local
    expect(
      isWithinBusinessHours(schedule, TZ, new Date("2026-10-18T13:00:00Z"))
    ).toBe(false);
  });

  it("supports shifts that cross midnight", () => {
    const night = weekdays("22:00", "06:00");
    // Monday 23:00 local
    expect(
      isWithinBusinessHours(night, TZ, new Date("2026-10-20T02:00:00Z"))
    ).toBe(true);
    // Tuesday 05:00 local, shift that started Monday
    expect(
      isWithinBusinessHours(night, TZ, new Date("2026-10-20T08:00:00Z"))
    ).toBe(true);
    // Tuesday 07:00 local
    expect(
      isWithinBusinessHours(night, TZ, new Date("2026-10-20T10:00:00Z"))
    ).toBe(false);
  });

  it("treats a queue without schedules as always open", () => {
    expect(
      isWithinBusinessHours([], TZ, new Date("2026-10-18T03:00:00Z"))
    ).toBe(true);
  });
});

describe("zoned dates", () => {
  it("finds the start of a local day in UTC", () => {
    expect(startOfZonedDay("2026-10-19", TZ).toISOString()).toBe(
      "2026-10-19T03:00:00.000Z"
    );
  });

  it("buckets an instant into the local day", () => {
    // 01:00 UTC on the 20th is still the 19th in São Paulo
    expect(zonedDayKey(new Date("2026-10-20T01:00:00Z"), TZ)).toBe(
      "2026-10-19"
    );
  });
});

describe("webhook address protection", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.5",
    "192.168.0.10",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:192.168.1.1"
  ])("blocks %s", address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700::1111"])("allows %s", address => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it("refuses to post to internal addresses, also through DNS", async () => {
    await expect(safePost("http://127.0.0.1:9/x", "{}", {})).rejects.toThrow(
      "ERR_WEBHOOK_BLOCKED_ADDRESS"
    );
    await expect(safePost("http://localhost:9/x", "{}", {})).rejects.toThrow(
      "ERR_WEBHOOK_BLOCKED_ADDRESS"
    );
    await expect(safePost("ftp://example.com/x", "{}", {})).rejects.toThrow(
      "ERR_WEBHOOK_INVALID_URL"
    );
  });
});

describe("csv export cells", () => {
  it("quotes values and escapes quotes", () => {
    expect(csvCell('Maria "Mari"')).toBe('"Maria ""Mari"""');
    expect(csvCell(null)).toBe("");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"');
    expect(csvCell("+5511")).toBe('"\'+5511"');
  });
});

describe("rating answers", () => {
  it("accepts only a single number from 1 to 5", () => {
    expect(parseRating("5")).toBe(5);
    expect(parseRating(" 3 ")).toBe(3);
    expect(parseRating("6")).toBeNull();
    expect(parseRating("nota 5")).toBeNull();
    expect(parseRating("")).toBeNull();
  });
});
