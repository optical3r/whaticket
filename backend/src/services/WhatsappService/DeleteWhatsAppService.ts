import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { DeleteCoexyConnection } from "../CoexyServices/CoexyChannelService";

const DeleteWhatsAppService = async (
  id: string,
  companyId: number
): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id, companyId }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  // The Coexy channel goes first: if Coexy cannot delete it now, the
  // connection stays and the admin can try again.
  await DeleteCoexyConnection(whatsapp.id);
  await whatsapp.destroy();
};

export default DeleteWhatsAppService;
