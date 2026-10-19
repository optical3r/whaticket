import formatBody from "../../helpers/Mustache";
import { companyRoom, getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Flow, { FlowOption, FlowStep } from "../../models/Flow";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import SendOutOfHoursMessage from "../QueueService/SendOutOfHoursMessage";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { SendAutomaticMessages } from "../WbotServices/SendAutomaticMessage";

// Runs a connection's flow for a waiting ticket. Each customer message
// moves the ticket one answer forward: steps are walked until one waits
// for an answer (menu, question) or ends the flow (queue, close, or a
// message without a next step).

const MAX_ATTEMPTS = 3;
// Message steps are checked for loops when saved; this is a safety net.
const MAX_STEPS_PER_TURN = 50;
const DEFAULT_INVALID = "Não entendi. Responda com o número de uma das opções.";
const GIVE_UP =
  "Não consegui entender. Uma pessoa da nossa equipe vai continuar o atendimento.";

const normalize = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");

export const menuText = (step: FlowStep, contact?: Contact): string => {
  const options = (step.options || [])
    .map((option, index) => `*${index + 1}* - ${option.label}`)
    .join("\n");
  const intro = contact ? formatBody(step.text, contact) : step.text;
  return `${intro}\n\n${options}`;
};

// The answer can be the option number or its text.
export const matchOption = (
  step: FlowStep,
  answer: string
): FlowOption | null => {
  const options = step.options || [];
  const value = normalize(answer || "");
  const number = Number(value);
  if (Number.isInteger(number) && number >= 1 && number <= options.length) {
    return options[number - 1];
  }
  return options.find(option => normalize(option.label) === value) || null;
};

interface Turn {
  ticket: Ticket;
  contact: Contact;
  flow: Flow;
  messages: string[];
  // Set when the flow sent the ticket to a queue.
  transferred?: boolean;
}

const finish = async (ticket: Ticket): Promise<void> => {
  await ticket.update({
    flowStepId: null,
    flowAttempts: 0,
    flowFinishedAt: new Date()
  });
};

const closeTicket = async (ticket: Ticket): Promise<void> => {
  // The flow closes without a reason, even where agents must give one.
  const oldStatus = ticket.status;
  await ticket.update({ status: "closed", closedAt: new Date() });
  getIO()
    .to(companyRoom(ticket.companyId, oldStatus))
    .emit("ticket", { action: "delete", ticketId: ticket.id });
};

const walk = async (turn: Turn, startId: string | null | undefined) => {
  const steps = new Map(
    turn.flow.definition.steps.map(step => [step.id, step])
  );
  let step = startId ? steps.get(startId) : undefined;

  // Message steps go straight on; the walk stops at the first step that
  // waits for an answer or ends the flow.
  for (
    let count = 0;
    step && step.type === "message" && count < MAX_STEPS_PER_TURN;
    count += 1
  ) {
    turn.messages.push(formatBody(step.text, turn.contact));
    step = step.next ? steps.get(step.next) : undefined;
  }

  if (!step || step.type === "message") {
    await finish(turn.ticket);
    return;
  }

  switch (step.type) {
    case "menu":
      turn.messages.push(menuText(step, turn.contact));
      await turn.ticket.update({ flowStepId: step.id, flowAttempts: 0 });
      return;
    case "question":
      turn.messages.push(formatBody(step.text, turn.contact));
      await turn.ticket.update({ flowStepId: step.id, flowAttempts: 0 });
      return;
    case "queue":
      if (step.text) turn.messages.push(formatBody(step.text, turn.contact));
      await finish(turn.ticket);
      await UpdateTicketService({
        ticketData: { queueId: step.queueId as number },
        ticketId: turn.ticket.id,
        companyId: turn.ticket.companyId
      });
      turn.transferred = true;
      return;
    default:
      if (step.text) turn.messages.push(formatBody(step.text, turn.contact));
      await finish(turn.ticket);
      await closeTicket(turn.ticket);
  }
};

const saveAnswer = async (
  contact: Contact,
  field: string,
  value: string
): Promise<void> => {
  const existing = await ContactCustomField.findOne({
    where: { contactId: contact.id, name: field }
  });
  const answer = value.slice(0, 255);
  if (existing) {
    await existing.update({ value: answer });
  } else {
    await ContactCustomField.create({
      contactId: contact.id,
      name: field,
      value: answer
    });
  }
};

// Returns true when the flow took care of the message, so the queue menu,
// the assistant and the out-of-hours notice stay out of it.
export const RunFlow = async ({
  ticket,
  whatsapp,
  contact,
  body
}: {
  ticket: Ticket;
  whatsapp: Whatsapp;
  contact: Contact;
  body: string;
}): Promise<boolean> => {
  if (
    ticket.isGroup ||
    ticket.userId ||
    ticket.status !== "pending" ||
    ticket.flowFinishedAt
  ) {
    return false;
  }

  let flow: Flow | null = null;
  const turnFor = (current: Flow): Turn => ({
    ticket,
    contact,
    flow: current,
    messages: []
  });
  let turn: Turn;

  if (ticket.flowStepId && ticket.flowId) {
    flow = await Flow.findOne({
      where: { id: ticket.flowId, companyId: ticket.companyId }
    });
    const step = flow?.definition.steps.find(
      item => item.id === ticket.flowStepId
    );
    if (!flow || !step) {
      // The flow changed under this conversation: hand it to the team.
      await finish(ticket);
      return false;
    }
    turn = turnFor(flow);

    if (step.type === "menu") {
      const option = matchOption(step, body);
      if (!option) {
        const attempts = ticket.flowAttempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          turn.messages.push(GIVE_UP);
          await finish(ticket);
        } else {
          await ticket.update({ flowAttempts: attempts });
          turn.messages.push(step.invalidText || DEFAULT_INVALID);
          turn.messages.push(menuText(step, contact));
        }
      } else {
        await walk(turn, option.next);
      }
    } else {
      await saveAnswer(contact, step.field || "Resposta", body || "");
      await walk(turn, step.next);
    }
  } else {
    if (!whatsapp.flowId || ticket.queueId) return false;
    flow = await Flow.findOne({
      where: { id: whatsapp.flowId, companyId: ticket.companyId }
    });
    if (!flow) return false;
    await ticket.update({ flowId: flow.id });
    turn = turnFor(flow);
    await walk(turn, flow.definition.startId);
  }

  try {
    await SendAutomaticMessages(
      ticket.whatsappId,
      `${contact.number}@c.us`,
      turn.messages
    );
    if (turn.transferred) {
      await ticket.reload();
      await SendOutOfHoursMessage(ticket, contact);
    }
  } catch (err) {
    logger.error({ info: "Could not send flow messages", err });
  }
  return true;
};
