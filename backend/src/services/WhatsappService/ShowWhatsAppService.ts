import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";

// companyId is required for anything triggered by a user. It is only omitted
// by internal callers (WhatsApp events), which start from a known connection.
const ShowWhatsAppService = async (
  id: string | number,
  companyId?: number
): Promise<Whatsapp> => {
  const whatsapp = await Whatsapp.findOne({
    where: companyId === undefined ? { id } : { id, companyId },
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      }
    ],
    order: [["queues", "name", "ASC"]]
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return whatsapp;
};

export default ShowWhatsAppService;
