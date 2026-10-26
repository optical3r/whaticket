import CloudApiCredential from "../../models/CloudApiCredential";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";

// Which official API connections go through Coexy, for the connection
// list (it shows "connect number" instead of "check").
export const cloudProvidersOf = async (
  whatsappIds: number[]
): Promise<Record<number, string>> => {
  if (!whatsappIds.length) return {};
  const rows = await CloudApiCredential.findAll({
    where: { whatsappId: whatsappIds },
    attributes: ["whatsappId", "provider"]
  });
  return rows.reduce(
    (all, row) => ({ ...all, [row.whatsappId]: row.provider }),
    {} as Record<number, string>
  );
};

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
