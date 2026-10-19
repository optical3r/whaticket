import { defineJob, enqueue } from "../../libs/queue";
import { whatsappProvider } from "../../providers/WhatsApp";

interface AutomaticMessageJob {
  whatsappId: number;
  chatId: string;
  body: string;
}

// Messages the system sends by itself (out-of-hours notice, satisfaction
// survey, thank-you). They start with ‎ so reports don't count them as
// an agent's reply. With Redis, a send that fails because the session is
// reconnecting is retried 3 times (30s, 1min, 2min).
defineJob<AutomaticMessageJob>(
  "whatsapp.automaticMessage",
  async ({ whatsappId, chatId, body }) => {
    await whatsappProvider.sendMessage(whatsappId, chatId, `‎${body}`);
  },
  { attempts: 3, backoff: { type: "exponential", delay: 30000 } }
);

const SendAutomaticMessage = (
  whatsappId: number,
  chatId: string,
  body: string
): Promise<void> =>
  enqueue<AutomaticMessageJob>("whatsapp.automaticMessage", {
    whatsappId,
    chatId,
    body
  });

export default SendAutomaticMessage;
