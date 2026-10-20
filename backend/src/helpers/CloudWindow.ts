import { subHours } from "date-fns";

import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";

// The Cloud API accepts free text (and media) only within 24 hours of the
// customer's last message; after that, only approved templates.
const WINDOW_HOURS = 24;

export const isCloudTicket = async (ticket: Ticket): Promise<boolean> => {
  if (!ticket.whatsappId) return false;
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId, {
    attributes: ["channel"]
  });
  return whatsapp?.channel === "cloudapi";
};

export const isWindowOpen = (ticket: Ticket, now = new Date()): boolean =>
  Boolean(
    ticket.lastInboundAt && ticket.lastInboundAt > subHours(now, WINDOW_HOURS)
  );

export const assertCanSendFreeText = async (ticket: Ticket): Promise<void> => {
  if ((await isCloudTicket(ticket)) && !isWindowOpen(ticket)) {
    throw new AppError("ERR_CLOUD_WINDOW_CLOSED");
  }
};
