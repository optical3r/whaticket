import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import AppError from "../../errors/AppError";
import { isSettingEnabled } from "../../helpers/CompanySettings";
import CloseReason from "../../models/CloseReason";
import {
  assertCloseReasonInCompany,
  assertQueuesInCompany,
  assertUserInCompany,
  assertWhatsappInCompany
} from "../../helpers/AssertCompanyOwnership";
import { companyRoom, getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
  closeReasonId?: number | null;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId
}: Request): Promise<Response> => {
  const { status, userId, queueId, whatsappId, closeReasonId } = ticketData;

  const ticket = await ShowTicketService(ticketId, companyId);

  await assertUserInCompany(userId, companyId);
  await assertQueuesInCompany([queueId], companyId);
  await assertWhatsappInCompany(whatsappId, companyId);
  await assertCloseReasonInCompany(closeReasonId, companyId);

  const isClosing = status === "closed" && ticket.status !== "closed";
  const isReopening = status !== undefined && status !== "closed";

  if (
    isClosing &&
    !closeReasonId &&
    (await isSettingEnabled(companyId, "closeReasonRequired")) &&
    (await CloseReason.count({ where: { companyId } })) > 0
  ) {
    throw new AppError("ERR_CLOSE_REASON_REQUIRED");
  }

  await SetTicketMessagesAsRead(ticket);

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  await ticket.update({
    status,
    queueId,
    userId,
    // closedAt and the reason describe the latest closing only.
    ...(isClosing
      ? { closedAt: new Date(), closeReasonId: closeReasonId || null }
      : {}),
    ...(isReopening ? { closedAt: null, closeReasonId: null } : {})
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  await ticket.reload();

  const io = getIO();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(companyRoom(companyId, oldStatus)).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to(companyRoom(companyId, ticket.status))
    .to(companyRoom(companyId, "notification"))
    .to(companyRoom(companyId, ticketId.toString()))
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
