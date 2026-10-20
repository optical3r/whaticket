import { defineJob, enqueue } from "../../libs/queue";
import { whatsappProvider } from "../../providers/WhatsApp";

interface AutomaticMessageJob {
  whatsappId: number;
  chatId: string;
  body: string;
}

// Messages the system sends by itself (out-of-hours notice, satisfaction
// survey, thank-you). They start with \u200e so reports don't count them as
// an agent's reply. With Redis, a send that fails because the session is
// reconnecting is retried 3 times (30s, 1min, 2min).
defineJob<AutomaticMessageJob>(
  "whatsapp.automaticMessage",
  async ({ whatsappId, chatId, body }) => {
    await whatsappProvider.sendMessage(whatsappId, chatId, `\u200e${body}`);
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

interface AutomaticSequenceJob {
  whatsappId: number;
  chatId: string;
  bodies: string[];
}

// Several messages that must arrive in order (a flow step and its menu).
// Each job sends the first one and only then queues the rest, so a retry
// never repeats a message and they never overtake each other.
defineJob<AutomaticSequenceJob>(
  "whatsapp.automaticSequence",
  async ({ whatsappId, chatId, bodies }) => {
    const [first, ...rest] = bodies;
    if (first) {
      await whatsappProvider.sendMessage(whatsappId, chatId, `\u200e${first}`);
    }
    if (rest.length > 0) {
      await enqueue<AutomaticSequenceJob>("whatsapp.automaticSequence", {
        whatsappId,
        chatId,
        bodies: rest
      });
    }
  },
  { attempts: 3, backoff: { type: "exponential", delay: 30000 } }
);

export const SendAutomaticMessages = async (
  whatsappId: number,
  chatId: string,
  bodies: string[]
): Promise<void> => {
  const texts = bodies.filter(body => body.trim());
  if (texts.length === 0) return;
  await enqueue<AutomaticSequenceJob>("whatsapp.automaticSequence", {
    whatsappId,
    chatId,
    bodies: texts
  });
};
