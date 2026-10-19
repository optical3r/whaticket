import Company from "../../models/Company";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

// Suspended companies keep their connections, but no session is started.
export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await Whatsapp.findAll({
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["id"],
        where: { status: "active" }
      },
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      }
    ]
  });

  whatsapps.forEach(whatsapp => {
    StartWhatsAppSession(whatsapp);
  });
};
