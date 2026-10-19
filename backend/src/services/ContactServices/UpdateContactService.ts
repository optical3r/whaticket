import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}
interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  extraInfo?: ExtraInfo[];
}

interface Request {
  contactData: ContactData;
  contactId: string;
  companyId: number;
}

const UpdateContactService = async ({
  contactData,
  contactId,
  companyId
}: Request): Promise<Contact> => {
  const { email, name, number, extraInfo } = contactData;

  const contact = await Contact.findOne({
    where: { id: contactId, companyId },
    attributes: ["id", "name", "number", "email", "profilePicUrl", "companyId"],
    include: ["extraInfo"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (extraInfo) {
    await Promise.all(
      extraInfo.map(async info => {
        // Only ids that already belong to this contact may be updated;
        // anything else is created as a new field.
        const ownsField = contact.extraInfo.some(old => old.id === info.id);
        const { id, ...fieldData } = info;
        await ContactCustomField.upsert({
          ...fieldData,
          ...(ownsField ? { id } : {}),
          contactId: contact.id
        });
      })
    );

    await Promise.all(
      contact.extraInfo.map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);

        if (stillExists === -1) {
          await ContactCustomField.destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }

  await contact.update({
    name,
    number,
    email
  });

  await contact.reload({
    attributes: ["id", "name", "number", "email", "profilePicUrl"],
    include: ["extraInfo"]
  });

  return contact;
};

export default UpdateContactService;
