import Contact from "../../models/Contact";
import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";

const ShowContactService = async (
  id: string | number,
  companyId: number
): Promise<Contact> => {
  const contact = await Contact.findOne({
    where: { id, companyId },
    include: [
      "extraInfo",
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  return contact;
};

export default ShowContactService;
