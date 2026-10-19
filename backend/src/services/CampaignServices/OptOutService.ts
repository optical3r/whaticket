import { subDays } from "date-fns";
import { Op } from "sequelize";

import CampaignContact from "../../models/CampaignContact";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import SendAutomaticMessage from "../WbotServices/SendAutomaticMessage";

const KEYWORDS = ["sair", "parar", "stop", "descadastrar", "cancelar"];
// Only someone who got a campaign recently is unsubscribing; "parar" in an
// ordinary conversation means something else.
const CAMPAIGN_WINDOW_DAYS = 30;

const CONFIRMATION =
  "Pronto. Você não vai mais receber nossas mensagens em massa. Se precisar de atendimento, é só escrever aqui.";

const normalize = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

export const isOptOutText = (text: string | undefined): boolean =>
  Boolean(text && KEYWORDS.includes(normalize(text)));

interface IncomingMessage {
  id: string;
  body: string;
  type: string;
  ack?: number;
}

// Returns true when the message was an opt-out and has been handled.
export const HandleOptOut = async (
  contact: Contact,
  whatsappId: number,
  message: IncomingMessage
): Promise<boolean> => {
  if (!isOptOutText(message.body) || contact.optOutAt) return false;

  const recentCampaign = await CampaignContact.findOne({
    where: {
      contactId: contact.id,
      status: "sent",
      sentAt: { [Op.gte]: subDays(new Date(), CAMPAIGN_WINDOW_DAYS) }
    }
  });
  if (!recentCampaign) return false;

  await contact.update({ optOutAt: new Date() });

  // The reply stays in the contact's history without reopening a ticket.
  const ticket = await Ticket.findOne({
    where: { contactId: contact.id, whatsappId },
    order: [["updatedAt", "DESC"]]
  });
  if (ticket) {
    await CreateMessageService({
      messageData: {
        id: message.id,
        ticketId: ticket.id,
        contactId: contact.id,
        body: message.body,
        fromMe: false,
        read: true,
        mediaType: message.type,
        ack: message.ack ?? 0
      }
    });
  }

  await SendAutomaticMessage(
    whatsappId,
    `${contact.number}@c.us`,
    CONFIRMATION
  );
  return true;
};
