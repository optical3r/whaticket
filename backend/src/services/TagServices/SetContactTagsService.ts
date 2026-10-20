import { assertTagsInCompany } from "../../helpers/AssertCompanyOwnership";
import Contact from "../../models/Contact";
import ShowContactService from "../ContactServices/ShowContactService";

const SetContactTagsService = async (
  contactId: number | string,
  tagIds: number[],
  companyId: number
): Promise<Contact> => {
  const contact = await ShowContactService(contactId, companyId);
  await assertTagsInCompany(tagIds, companyId);

  await contact.$set("tags", tagIds);

  return ShowContactService(contact.id, companyId);
};

export default SetContactTagsService;
