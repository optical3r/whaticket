import { subHours } from "date-fns";

import formatBody from "../../helpers/Mustache";
import { isWithinBusinessHours } from "../../helpers/BusinessHours";
import Company from "../../models/Company";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp";
import { logger } from "../../utils/logger";

// The customer gets the message at most once in this window per ticket.
const REPEAT_AFTER_HOURS = 6;

// Tells the customer the queue is closed. Only for tickets nobody has
// picked up yet, so a conversation already in progress is never interrupted.
const SendOutOfHoursMessage = async (
  ticket: Ticket,
  contact: Contact,
  now: Date = new Date()
): Promise<boolean> => {
  if (!ticket.queueId || ticket.status !== "pending" || ticket.isGroup) {
    return false;
  }

  const queue = await Queue.findByPk(ticket.queueId);
  if (!queue || !queue.outOfHoursMessage || queue.schedules.length === 0) {
    return false;
  }

  const company = await Company.findByPk(ticket.companyId, {
    attributes: ["id", "timezone"]
  });
  const timezone = company?.timezone || "America/Sao_Paulo";

  if (isWithinBusinessHours(queue.schedules, timezone, now)) {
    return false;
  }

  if (
    ticket.outOfHoursNotifiedAt &&
    ticket.outOfHoursNotifiedAt > subHours(now, REPEAT_AFTER_HOURS)
  ) {
    return false;
  }

  try {
    // \u200e marks automatic messages (they don't count as agent replies).
    await whatsappProvider.sendMessage(
      ticket.whatsappId,
      `${contact.number}@c.us`,
      `\u200e${formatBody(queue.outOfHoursMessage, contact)}`
    );
    await ticket.update({ outOfHoursNotifiedAt: now });
    return true;
  } catch (err) {
    logger.error({ info: "Error sending out-of-hours message", err });
    return false;
  }
};

export default SendOutOfHoursMessage;
