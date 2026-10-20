import { QueryTypes } from "sequelize";

import sequelize from "../../database";
import { ReportFilters, resolveRange } from "./ReportService";

const AUTOMATIC_MARK = "\u200e%";
const MAX_ROWS = 50000;

// Quotes a CSV cell and neutralises values a spreadsheet would run as a
// formula (=, +, -, @).
export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

const HEADER = [
  "ticket",
  "contato",
  "numero",
  "fila",
  "atendente",
  "status",
  "criado_em",
  "primeira_resposta_em",
  "encerrado_em",
  "motivo_encerramento",
  "avaliacao",
  "etiquetas"
];

interface Row {
  id: number;
  contactName: string | null;
  contactNumber: string | null;
  queueName: string | null;
  userName: string | null;
  status: string;
  createdAt: Date;
  firstResponseAt: Date | null;
  closedAt: Date | null;
  closeReason: string | null;
  rating: number | null;
  tags: string | null;
}

// Tickets created in the period, one per line, for spreadsheets.
const ExportTicketsCsvService = async (
  filters: ReportFilters
): Promise<string> => {
  const { start, end } = await resolveRange(filters);

  const clauses = ["t.companyId = :companyId"];
  if (filters.queueId) clauses.push("t.queueId = :queueId");
  if (filters.userId) clauses.push("t.userId = :userId");

  const rows = (await sequelize.query(
    `
    SELECT t.id, c.name AS contactName, c.number AS contactNumber,
      q.name AS queueName, u.name AS userName, t.status, t.createdAt,
      (SELECT MIN(m.createdAt) FROM Messages m
        WHERE m.ticketId = t.id AND m.fromMe = 1 AND m.createdAt >= t.createdAt
          AND (m.body IS NULL OR m.body NOT LIKE :automatic)) AS firstResponseAt,
      t.closedAt, cr.name AS closeReason,
      (SELECT r.rating FROM TicketRatings r
        WHERE r.ticketId = t.id AND r.rating IS NOT NULL
        ORDER BY r.ratedAt DESC LIMIT 1) AS rating,
      (SELECT GROUP_CONCAT(tg.name ORDER BY tg.name SEPARATOR ', ')
        FROM TicketTags tt JOIN Tags tg ON tg.id = tt.tagId
        WHERE tt.ticketId = t.id) AS tags
    FROM Tickets t
    LEFT JOIN Contacts c ON c.id = t.contactId
    LEFT JOIN Queues q ON q.id = t.queueId
    LEFT JOIN Users u ON u.id = t.userId
    LEFT JOIN CloseReasons cr ON cr.id = t.closeReasonId
    WHERE ${clauses.join(
      " AND "
    )} AND t.createdAt >= :start AND t.createdAt < :end
    ORDER BY t.createdAt ASC
    LIMIT ${MAX_ROWS}`,
    {
      replacements: {
        companyId: filters.companyId,
        queueId: filters.queueId,
        userId: filters.userId,
        start,
        end,
        automatic: AUTOMATIC_MARK
      },
      type: QueryTypes.SELECT
    }
  )) as unknown as Row[];

  const lines = rows.map(row =>
    [
      row.id,
      row.contactName,
      row.contactNumber,
      row.queueName,
      row.userName,
      row.status,
      row.createdAt && new Date(row.createdAt),
      row.firstResponseAt && new Date(row.firstResponseAt),
      row.closedAt && new Date(row.closedAt),
      row.closeReason,
      row.rating,
      row.tags
    ]
      .map(csvCell)
      .join(",")
  );

  // BOM so Excel opens the accents correctly.
  return `\ufeff${[HEADER.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
};

export default ExportTicketsCsvService;
