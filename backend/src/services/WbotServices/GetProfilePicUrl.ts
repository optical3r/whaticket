import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { whatsappProvider } from "../../providers/WhatsApp";

const GetProfilePicUrl = async (
  number: string,
  companyId: number
): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  const profilePicUrl = await whatsappProvider.getProfilePicUrl(
    defaultWhatsapp.id,
    number
  );

  return profilePicUrl;
};

export default GetProfilePicUrl;
