import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import { DispatchWebhookEvent } from "../WebhookServices/WebhookServices";
import { ticketPayload } from "../../helpers/WebhookPayloads";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact,
  // For messages the system sends on its own (campaigns): without an open
  // conversation, the message goes to a closed ticket, which the
  // customer's reply reopens.
  { keepClosed = false }: { keepClosed?: boolean } = {}
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  if (!ticket && keepClosed) {
    const closed =
      (await Ticket.findOne({
        where: { contactId: contact.id, whatsappId, status: "closed" },
        order: [["updatedAt", "DESC"]]
      })) ||
      (await Ticket.create({
        contactId: contact.id,
        status: "closed",
        unreadMessages: 0,
        whatsappId,
        companyId: contact.companyId
      }));
    return ShowTicketService(closed.id, contact.companyId);
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  let created = false;
  if (!ticket) {
    created = true;
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      companyId: contact.companyId
    });
  }

  ticket = await ShowTicketService(ticket.id, contact.companyId);

  if (created) {
    DispatchWebhookEvent(
      ticket.companyId,
      "ticket.created",
      ticketPayload(ticket)
    );
  }

  return ticket;
};

export default FindOrCreateTicketService;
