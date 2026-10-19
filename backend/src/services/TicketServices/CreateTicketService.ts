import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import ShowContactService from "../ContactServices/ShowContactService";
import { DispatchWebhookEvent } from "../WebhookServices/WebhookServices";
import { ticketPayload } from "../../helpers/WebhookPayloads";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  queueId?: number;
  companyId: number;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId, userId);

  await CheckContactOpenTickets(contactId, defaultWhatsapp.id);

  const { isGroup } = await ShowContactService(contactId, companyId);

  if (queueId === undefined) {
    const user = await User.findOne({
      where: { id: userId, companyId },
      include: ["queues"]
    });
    queueId = user?.queues.length === 1 ? user.queues[0].id : undefined;
  }

  const { id }: Ticket = await defaultWhatsapp.$create("ticket", {
    contactId,
    status,
    isGroup,
    userId,
    queueId,
    companyId
  });

  const ticket = await Ticket.findByPk(id, { include: ["contact"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  DispatchWebhookEvent(companyId, "ticket.created", ticketPayload(ticket));

  return ticket;
};

export default CreateTicketService;
