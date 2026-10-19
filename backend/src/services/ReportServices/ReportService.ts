import { QueryTypes } from "sequelize";
import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";

import AppError from "../../errors/AppError";
import sequelize from "../../database";
import Company from "../../models/Company";
import {
  isValidDay,
  startOfZonedDay,
  zonedDayKey
} from "../../helpers/ZonedDate";

const MAX_RANGE_DAYS = 366;

// Messages the system sends by itself (greetings, out-of-hours, survey)
// start with this mark and are not counted as an agent's first response.
const AUTOMATIC_MARK = "\u200e%";

export interface ReportFilters {
  companyId: number;
  from: string; // YYYY-MM-DD, company time zone
  to: string; // YYYY-MM-DD, inclusive
  queueId?: number;
  userId?: number;
}

export interface ResolvedRange {
  start: Date;
  end: Date;
  timezone: string;
}

export const resolveRange = async ({
  companyId,
  from,
  to
}: ReportFilters): Promise<ResolvedRange> => {
  if (!isValidDay(from) || !isValidDay(to) || from > to) {
    throw new AppError("ERR_REPORT_INVALID_RANGE");
  }
  if (
    differenceInCalendarDays(parseISO(to), parseISO(from)) >= MAX_RANGE_DAYS
  ) {
    throw new AppError("ERR_REPORT_RANGE_TOO_LONG");
  }

  const company = await Company.findByPk(companyId, {
    attributes: ["id", "timezone"]
  });
  const timezone = company?.timezone || "America/Sao_Paulo";

  const nextDay = format(addDays(parseISO(to), 1), "yyyy-MM-dd");
  return {
    start: startOfZonedDay(from, timezone),
    end: startOfZonedDay(nextDay, timezone),
    timezone
  };
};

// Optional queue/user filter shared by every query (t = Tickets alias).
const ticketFilter = (filters: ReportFilters) => {
  const clauses = ["t.companyId = :companyId"];
  if (filters.queueId) clauses.push("t.queueId = :queueId");
  if (filters.userId) clauses.push("t.userId = :userId");
  return clauses.join(" AND ");
};

// First agent reply of each ticket created in the period.
const firstResponseJoin = `
  LEFT JOIN (
    SELECT m.ticketId, MIN(m.createdAt) AS firstAt
    FROM Messages m
    WHERE m.fromMe = 1 AND (m.body IS NULL OR m.body NOT LIKE :automatic)
    GROUP BY m.ticketId
  ) fr ON fr.ticketId = t.id AND fr.firstAt >= t.createdAt`;

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export interface ReportSummary {
  range: { from: string; to: string; timezone: string };
  totals: {
    created: number;
    closed: number;
    avgFirstResponseSeconds: number | null;
    avgResolutionSeconds: number | null;
  };
  now: { open: number; pending: number };
  csat: {
    average: number | null;
    answered: number;
    sent: number;
    distribution: Record<string, number>;
  };
  byDay: Array<{ day: string; created: number; closed: number }>;
  byQueue: Array<{
    queueId: number | null;
    name: string | null;
    color: string | null;
    created: number;
    avgFirstResponseSeconds: number | null;
  }>;
  byUser: Array<{
    userId: number | null;
    name: string | null;
    closed: number;
    avgResolutionSeconds: number | null;
    avgRating: number | null;
  }>;
  byCloseReason: Array<{
    closeReasonId: number | null;
    name: string | null;
    closed: number;
  }>;
}

const ReportService = async (
  filters: ReportFilters
): Promise<ReportSummary> => {
  const { start, end, timezone } = await resolveRange(filters);
  const where = ticketFilter(filters);
  const replacements = {
    companyId: filters.companyId,
    queueId: filters.queueId,
    userId: filters.userId,
    start,
    end,
    automatic: AUTOMATIC_MARK
  };
  const select = <T>(sql: string): Promise<T[]> =>
    sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    }) as unknown as Promise<T[]>;

  const [createdRow] = await select<{
    created: number;
    avgFirst: number | null;
  }>(`
    SELECT COUNT(*) AS created,
      AVG(TIMESTAMPDIFF(SECOND, t.createdAt, fr.firstAt)) AS avgFirst
    FROM Tickets t ${firstResponseJoin}
    WHERE ${where} AND t.createdAt >= :start AND t.createdAt < :end`);

  const [closedRow] = await select<{
    closed: number;
    avgResolution: number | null;
  }>(`
    SELECT COUNT(*) AS closed,
      AVG(TIMESTAMPDIFF(SECOND, t.createdAt, t.closedAt)) AS avgResolution
    FROM Tickets t
    WHERE ${where} AND t.closedAt >= :start AND t.closedAt < :end`);

  const nowRows = await select<{ status: string; total: number }>(`
    SELECT t.status, COUNT(*) AS total FROM Tickets t
    WHERE ${where} AND t.status IN ('open', 'pending') GROUP BY t.status`);

  const ratingRows = await select<{ rating: number | null; total: number }>(`
    SELECT r.rating, COUNT(*) AS total
    FROM TicketRatings r JOIN Tickets t ON t.id = r.ticketId
    WHERE ${where} AND r.createdAt >= :start AND r.createdAt < :end
    GROUP BY r.rating`);

  const queueRows = await select<{
    queueId: number | null;
    name: string | null;
    color: string | null;
    created: number;
    avgFirst: number | null;
  }>(`
    SELECT t.queueId, q.name, q.color, COUNT(*) AS created,
      AVG(TIMESTAMPDIFF(SECOND, t.createdAt, fr.firstAt)) AS avgFirst
    FROM Tickets t ${firstResponseJoin}
    LEFT JOIN Queues q ON q.id = t.queueId
    WHERE ${where} AND t.createdAt >= :start AND t.createdAt < :end
    GROUP BY t.queueId, q.name, q.color
    ORDER BY created DESC`);

  const userRows = await select<{
    userId: number | null;
    name: string | null;
    closed: number;
    avgResolution: number | null;
    avgRating: number | null;
  }>(`
    SELECT t.userId, u.name, COUNT(*) AS closed,
      AVG(TIMESTAMPDIFF(SECOND, t.createdAt, t.closedAt)) AS avgResolution,
      AVG(r.rating) AS avgRating
    FROM Tickets t
    LEFT JOIN Users u ON u.id = t.userId
    LEFT JOIN (
      SELECT ticketId, AVG(rating) AS rating FROM TicketRatings
      WHERE rating IS NOT NULL GROUP BY ticketId
    ) r ON r.ticketId = t.id
    WHERE ${where} AND t.closedAt >= :start AND t.closedAt < :end
    GROUP BY t.userId, u.name
    ORDER BY closed DESC`);

  const reasonRows = await select<{
    closeReasonId: number | null;
    name: string | null;
    closed: number;
  }>(`
    SELECT t.closeReasonId, c.name, COUNT(*) AS closed
    FROM Tickets t LEFT JOIN CloseReasons c ON c.id = t.closeReasonId
    WHERE ${where} AND t.closedAt >= :start AND t.closedAt < :end
    GROUP BY t.closeReasonId, c.name
    ORDER BY closed DESC`);

  // Days are bucketed here because MySQL needs extra tables for time zones.
  const createdDates = await select<{ at: Date }>(`
    SELECT t.createdAt AS at FROM Tickets t
    WHERE ${where} AND t.createdAt >= :start AND t.createdAt < :end`);
  const closedDates = await select<{ at: Date }>(`
    SELECT t.closedAt AS at FROM Tickets t
    WHERE ${where} AND t.closedAt >= :start AND t.closedAt < :end`);

  const days = new Map<string, { created: number; closed: number }>();
  for (
    let day = filters.from;
    day <= filters.to;
    day = format(addDays(parseISO(day), 1), "yyyy-MM-dd")
  ) {
    days.set(day, { created: 0, closed: 0 });
  }
  createdDates.forEach(({ at }) => {
    const bucket = days.get(zonedDayKey(new Date(at), timezone));
    if (bucket) bucket.created += 1;
  });
  closedDates.forEach(({ at }) => {
    const bucket = days.get(zonedDayKey(new Date(at), timezone));
    if (bucket) bucket.closed += 1;
  });

  const distribution: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sent = 0;
  let answered = 0;
  let ratingSum = 0;
  ratingRows.forEach(({ rating, total }) => {
    const count = Number(total);
    sent += count;
    if (rating !== null) {
      answered += count;
      ratingSum += Number(rating) * count;
      distribution[String(rating)] = count;
    }
  });

  return {
    range: { from: filters.from, to: filters.to, timezone },
    totals: {
      created: Number(createdRow.created),
      closed: Number(closedRow.closed),
      avgFirstResponseSeconds: toNumber(createdRow.avgFirst),
      avgResolutionSeconds: toNumber(closedRow.avgResolution)
    },
    now: {
      open: Number(nowRows.find(row => row.status === "open")?.total || 0),
      pending: Number(nowRows.find(row => row.status === "pending")?.total || 0)
    },
    csat: {
      average: answered ? ratingSum / answered : null,
      answered,
      sent,
      distribution
    },
    byDay: [...days.entries()].map(([day, counts]) => ({ day, ...counts })),
    byQueue: queueRows.map(row => ({
      queueId: row.queueId,
      name: row.name,
      color: row.color,
      created: Number(row.created),
      avgFirstResponseSeconds: toNumber(row.avgFirst)
    })),
    byUser: userRows.map(row => ({
      userId: row.userId,
      name: row.name,
      closed: Number(row.closed),
      avgResolutionSeconds: toNumber(row.avgResolution),
      avgRating: toNumber(row.avgRating)
    })),
    byCloseReason: reasonRows.map(row => ({
      closeReasonId: row.closeReasonId,
      name: row.name,
      closed: Number(row.closed)
    }))
  };
};

export default ReportService;
