import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { whatsappProvider } from "../../providers/WhatsApp";

const CheckContactNumber = async (
  number: string,
  companyId: number
): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  const validNumber = await whatsappProvider.checkNumber(
    defaultWhatsapp.id,
    number
  );
  return validNumber;
};

export default CheckContactNumber;
