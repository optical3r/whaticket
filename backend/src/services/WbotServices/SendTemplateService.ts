import AppError from "../../errors/AppError";
import { isCloudTicket } from "../../helpers/CloudWindow";
import Ticket from "../../models/Ticket";
import {
  listTemplates,
  sendTemplate
} from "../../providers/WhatsApp/Implementations/cloudapi";
import { ProviderMessage } from "../../providers/WhatsApp";

// Sends an approved template of the ticket's Cloud API connection, the
// only way to write after 24 hours without a message from the customer.
const SendTemplateService = async ({
  ticket,
  name,
  language,
  params
}: {
  ticket: Ticket;
  name: unknown;
  language: unknown;
  params: unknown;
}): Promise<ProviderMessage> => {
  if (!(await isCloudTicket(ticket))) {
    throw new AppError("ERR_CLOUD_TEMPLATES_ONLY");
  }

  const templates = await listTemplates(ticket.whatsappId);
  const template = templates.find(
    item => item.name === name && item.language === language
  );
  if (!template) {
    throw new AppError("ERR_CLOUD_TEMPLATE_NOT_FOUND", 404);
  }

  const values = Array.isArray(params)
    ? params.map(value => String(value))
    : [];
  if (
    values.length !== template.params ||
    values.some(value => !value.trim() || value.length > 1000)
  ) {
    throw new AppError("ERR_CLOUD_TEMPLATE_PARAMS");
  }

  // What the agent sees in the conversation: the template with its values.
  const bodyText = values.reduce(
    (text, value, index) => text.split(`{{${index + 1}}}`).join(value),
    template.body
  );

  const message = await sendTemplate(
    ticket.whatsappId,
    `${ticket.contact.number}@c.us`,
    { name: template.name, language: template.language, bodyParams: values },
    bodyText
  );
  await ticket.update({ lastMessage: bodyText });
  return message;
};

export default SendTemplateService;
