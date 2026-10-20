import { assertTagsInCompany } from "../../helpers/AssertCompanyOwnership";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

const SetTicketTagsService = async (
  ticketId: number | string,
  tagIds: number[],
  companyId: number
): Promise<Ticket> => {
  const ticket = await ShowTicketService(ticketId, companyId);
  await assertTagsInCompany(tagIds, companyId);

  await ticket.$set("tags", tagIds);

  return ShowTicketService(ticket.id, companyId);
};

export default SetTicketTagsService;
