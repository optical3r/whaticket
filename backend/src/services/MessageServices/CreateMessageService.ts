import { companyRoom, getIO } from "../../libs/socket";
import { DispatchWebhookEvent } from "../WebhookServices/WebhookServices";
import { messagePayload } from "../../helpers/WebhookPayloads";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  quotedMsgId?: string;
}
interface Request {
  messageData: MessageData;
}

const CreateMessageService = async ({
  messageData
}: Request): Promise<Message> => {
  await Message.upsert(messageData);

  const message = await Message.findByPk(messageData.id, {
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          "contact",
          "queue",
          {
            model: Whatsapp,
            as: "whatsapp",
            attributes: ["name"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const { companyId } = message.ticket;
  const io = getIO();
  io.to(companyRoom(companyId, message.ticketId.toString()))
    .to(companyRoom(companyId, message.ticket.status))
    .to(companyRoom(companyId, "notification"))
    .emit("appMessage", {
      action: "create",
      message,
      ticket: message.ticket,
      contact: message.ticket.contact
    });

  DispatchWebhookEvent(
    companyId,
    message.fromMe ? "message.sent" : "message.received",
    messagePayload(message)
  );

  return message;
};

export default CreateMessageService;
