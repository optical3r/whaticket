import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";

// Without companyId it lists every connection (used to start all sessions).
const ListWhatsAppsService = async (
  companyId?: number
): Promise<Whatsapp[]> => {
  const whatsapps = await Whatsapp.findAll({
    where: companyId === undefined ? {} : { companyId },
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      }
    ]
  });

  return whatsapps;
};

export default ListWhatsAppsService;
