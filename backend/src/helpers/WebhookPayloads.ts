import Message from "../models/Message";
import Ticket from "../models/Ticket";

// Small, stable shapes sent to webhooks (no internal fields).
export const ticketPayload = (ticket: Ticket): Record<string, unknown> => ({
  id: ticket.id,
  status: ticket.status,
  queueId: ticket.queueId,
  userId: ticket.userId,
  whatsappId: ticket.whatsappId,
  isGroup: ticket.isGroup,
  createdAt: ticket.createdAt,
  closedAt: ticket.closedAt,
  closeReasonId: ticket.closeReasonId,
  contact: ticket.contact
    ? {
        id: ticket.contact.id,
        name: ticket.contact.name,
        number: ticket.contact.number
      }
    : undefined
});

export const messagePayload = (message: Message): Record<string, unknown> => ({
  id: message.id,
  ticketId: message.ticketId,
  body: message.body,
  fromMe: message.fromMe,
  mediaType: message.mediaType,
  mediaUrl: message.mediaUrl,
  createdAt: message.createdAt,
  contact: message.ticket?.contact
    ? {
        id: message.ticket.contact.id,
        name: message.ticket.contact.name,
        number: message.ticket.contact.number
      }
    : undefined
});
