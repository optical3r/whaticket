import { Request, Response } from "express";
import { companyRoom, getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import formatBody from "../helpers/Mustache";
import { DispatchWebhookEvent } from "../services/WebhookServices/WebhookServices";
import { ticketPayload } from "../helpers/WebhookPayloads";
import { SendRatingRequest } from "../services/TicketServices/TicketRatingService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tagIds: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  closeReasonId?: number | null;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tagIds: tagIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const { id: userId, companyId, profile } = req.user;

  let queueIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  const tagIds: number[] = tagIdsStringified
    ? JSON.parse(tagIdsStringified)
    : [];

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    // Only managers may see every ticket, regardless of who is assigned.
    showAll:
      profile === "admin" || profile === "supervisor" ? showAll : "false",
    userId,
    queueIds,
    withUnreadMessages,
    tagIds: Array.isArray(tagIds) ? tagIds : [],
    companyId
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId }: TicketData = req.body;
  const { companyId } = req.user;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    companyId
  });

  const io = getIO();
  io.to(companyRoom(companyId, ticket.status)).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const contact = await ShowTicketService(ticketId, req.user.companyId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;
  const { companyId } = req.user;

  const { ticket, oldStatus } = await UpdateTicketService({
    ticketData,
    ticketId,
    companyId
  });

  if (ticket.status === "closed" && oldStatus !== "closed") {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId, companyId);

    const { farewellMessage } = whatsapp;

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: formatBody(farewellMessage, ticket.contact),
        ticket
      });
    }

    await SendRatingRequest(ticket);
    DispatchWebhookEvent(companyId, "ticket.closed", ticketPayload(ticket));
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const { companyId } = req.user;
  const ticket = await DeleteTicketService(ticketId, companyId);

  const io = getIO();
  io.to(companyRoom(companyId, ticket.status))
    .to(companyRoom(companyId, ticketId))
    .to(companyRoom(companyId, "notification"))
    .emit("ticket", {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};
