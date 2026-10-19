import { subHours } from "date-fns";
import { Op } from "sequelize";

import formatBody from "../../helpers/Mustache";
import {
  getCompanySetting,
  isSettingEnabled
} from "../../helpers/CompanySettings";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import TicketRating from "../../models/TicketRating";
import { whatsappProvider } from "../../providers/WhatsApp";
import { logger } from "../../utils/logger";
import { DispatchWebhookEvent } from "../WebhookServices/WebhookServices";

// How long the customer has to answer the survey.
const ANSWER_WINDOW_HOURS = 24;

const chatIdFor = (ticket: Ticket, contact: Contact): string =>
  `${contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

// Sends the satisfaction survey after a ticket is closed, when enabled.
export const SendRatingRequest = async (
  ticket: Ticket
): Promise<TicketRating | null> => {
  if (
    ticket.isGroup ||
    !ticket.whatsappId ||
    !(await isSettingEnabled(ticket.companyId, "csatEnabled"))
  ) {
    return null;
  }

  // A new survey replaces any unanswered one for the same ticket.
  await TicketRating.destroy({
    where: { ticketId: ticket.id, rating: null }
  });

  const rating = await TicketRating.create({
    ticketId: ticket.id,
    userId: ticket.userId,
    companyId: ticket.companyId
  });

  try {
    const message = await getCompanySetting(ticket.companyId, "csatMessage");
    // \u200e marks automatic messages (they don't count as agent replies).
    await whatsappProvider.sendMessage(
      ticket.whatsappId,
      chatIdFor(ticket, ticket.contact),
      `\u200e${formatBody(message, ticket.contact)}`
    );
  } catch (err) {
    logger.error({ info: "Error sending rating request", err });
  }

  return rating;
};

// The open survey for this contact on this connection, if any.
export const FindPendingRating = async (
  contact: Contact,
  whatsappId: number,
  now: Date = new Date()
): Promise<TicketRating | null> =>
  TicketRating.findOne({
    where: {
      companyId: contact.companyId,
      rating: null,
      createdAt: { [Op.gt]: subHours(now, ANSWER_WINDOW_HOURS) }
    },
    include: [
      {
        model: Ticket,
        as: "ticket",
        where: { contactId: contact.id, whatsappId, status: "closed" }
      }
    ],
    order: [["createdAt", "DESC"]]
  });

export const parseRating = (body: string): number | null => {
  const match = /^\s*([1-5])\s*$/.exec(body || "");
  return match ? Number(match[1]) : null;
};

// Saves the answer and thanks the customer. Returns false when the message
// is not a valid answer, so it is handled as a normal message.
export const RegisterRatingAnswer = async (
  pending: TicketRating,
  body: string,
  contact: Contact
): Promise<boolean> => {
  const value = parseRating(body);
  if (value === null) return false;

  await pending.update({ rating: value, ratedAt: new Date() });

  DispatchWebhookEvent(pending.companyId, "ticket.rated", {
    ticketId: pending.ticketId,
    userId: pending.userId,
    rating: value,
    contact: { id: contact.id, name: contact.name, number: contact.number }
  });

  try {
    const thanks = await getCompanySetting(
      pending.companyId,
      "csatThanksMessage"
    );
    await whatsappProvider.sendMessage(
      pending.ticket.whatsappId,
      chatIdFor(pending.ticket, contact),
      `\u200e${formatBody(thanks, contact)}`
    );
  } catch (err) {
    logger.error({ info: "Error sending rating thanks", err });
  }

  return true;
};
