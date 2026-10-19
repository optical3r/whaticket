import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { whatsappProvider } from "../../providers/WhatsApp";

const CheckIsValidContact = async (
  number: string,
  companyId: number
): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  try {
    const isValidNumber = await whatsappProvider.checkNumber(
      defaultWhatsapp.id,
      number
    );
    if (!isValidNumber) {
      throw new AppError("invalidNumber");
    }
  } catch (err) {
    if (err.message === "invalidNumber") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
