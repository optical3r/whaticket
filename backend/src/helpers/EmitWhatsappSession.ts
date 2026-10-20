import { emitToCompany } from "../libs/socket";
import Whatsapp from "../models/Whatsapp";

// Session status changes only go to the company that owns the connection.
const EmitWhatsappSession = (whatsapp: Whatsapp): void => {
  emitToCompany(whatsapp.companyId, "whatsappSession", {
    action: "update",
    session: whatsapp
  });
};

export default EmitWhatsappSession;
