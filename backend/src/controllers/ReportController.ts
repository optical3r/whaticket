import { Request, Response } from "express";

import ReportService, {
  ReportFilters
} from "../services/ReportServices/ReportService";
import ExportTicketsCsvService from "../services/ReportServices/ExportTicketsCsvService";

type ReportQuery = {
  from?: string;
  to?: string;
  queueId?: string;
  userId?: string;
};

const parseFilters = (req: Request): ReportFilters => {
  const { from = "", to = "", queueId, userId } = req.query as ReportQuery;
  const toId = (value?: string) =>
    value && Number.isInteger(Number(value)) ? Number(value) : undefined;

  return {
    companyId: req.user.companyId,
    from,
    to,
    queueId: toId(queueId),
    userId: toId(userId)
  };
};

export const summary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const report = await ReportService(parseFilters(req));

  return res.status(200).json(report);
};

export const exportCsv = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const filters = parseFilters(req);
  const csv = await ExportTicketsCsvService(filters);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="tickets-${filters.from}-a-${filters.to}.csv"`
  );

  return res.status(200).send(csv);
};
