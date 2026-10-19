import faker from "faker";

import AppError from "../../../errors/AppError";
import { enqueue } from "../../../libs/queue";
import Contact from "../../../models/Contact";
import ContactCustomField from "../../../models/ContactCustomField";
import Queue from "../../../models/Queue";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import { RunFlow } from "../../../services/FlowServices/FlowEngine";
import {
  SaveFlowService,
  validateDefinition
} from "../../../services/FlowServices/FlowServices";
import { disconnect, truncate } from "../../utils/database";

jest.mock("../../../libs/socket", () => {
  const emitter = { to: () => emitter, emit: () => true };
  return {
    getIO: () => emitter,
    emitToCompany: () => undefined,
    companyRoom: (companyId: number, room?: string | number) =>
      room === undefined
        ? `company-${companyId}`
        : `company-${companyId}-${room}`
  };
});

// The test reads what would be sent from the queued jobs.
jest.mock("../../../libs/queue", () => ({
  defineJob: jest.fn(),
  enqueue: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue({}),
    sendSeen: jest.fn().mockResolvedValue(undefined)
  }
}));

const queued = enqueue as jest.Mock;

const sentBodies = (): string[] =>
  queued.mock.calls
    .filter(([name]) => name === "whatsapp.automaticSequence")
    .reduce(
      (all: string[], [, data]: [string, { bodies: string[] }]) =>
        all.concat(data.bodies),
      []
    );

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const definition = (queueId: number) => ({
  startId: "welcome",
  steps: [
    {
      id: "welcome",
      type: "message",
      text: "Olá, {{firstName}}! Bem-vindo à Loja.",
      next: "menu"
    },
    {
      id: "menu",
      type: "menu",
      text: "Como podemos ajudar?",
      invalidText: "Escolha uma opção da lista.",
      options: [
        { label: "Comprar", next: "name" },
        { label: "Horário", next: "hours" }
      ]
    },
    {
      id: "name",
      type: "question",
      text: "Qual produto você procura?",
      field: "Produto",
      next: "sales"
    },
    {
      id: "sales",
      type: "queue",
      text: "Vou te passar para o comercial.",
      queueId
    },
    {
      id: "hours",
      type: "close",
      text: "Abrimos de segunda a sexta, das 9h às 18h."
    }
  ]
});

const setup = async () => {
  const queue = await Queue.create({
    name: "Comercial",
    color: "#3478F6",
    companyId: 1
  });
  const flow = await SaveFlowService(1, {
    name: "Atendimento",
    definition: definition(queue.id)
  });
  const whatsapp = await Whatsapp.create({
    name: faker.random.uuid(),
    flowId: flow.id,
    companyId: 1
  });
  const contact = await Contact.create({
    name: "Paula Souza",
    number: faker.phone.phoneNumber("55119########"),
    companyId: 1
  });
  const ticket = await Ticket.create({
    contactId: contact.id,
    whatsappId: whatsapp.id,
    status: "pending",
    companyId: 1
  });
  const say = async (body: string) =>
    RunFlow({ ticket: await ticket.reload(), whatsapp, contact, body });
  return { queue, flow, whatsapp, contact, ticket, say };
};

describe("Phase 5: flows", () => {
  beforeEach(async () => {
    await truncate();
    queued.mockClear();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  it("rejects broken links, message loops and other companies' queues", async () => {
    const queue = await Queue.create({
      name: "Q",
      color: "#3478F6",
      companyId: 1
    });
    const good = definition(queue.id);

    await expectAppError(
      validateDefinition(1, { ...good, startId: "nope" }),
      "ERR_FLOW_BROKEN_LINK"
    );
    await expectAppError(
      validateDefinition(1, {
        startId: "a",
        steps: [
          { id: "a", type: "message", text: "1", next: "b" },
          { id: "b", type: "message", text: "2", next: "a" }
        ]
      }),
      "ERR_FLOW_LOOP"
    );

    const other = await CreateCompanyService({
      name: "Outra",
      planId: 1,
      adminName: "Admin",
      adminEmail: faker.internet.email(),
      adminPassword: "123456"
    });
    const foreign = await Queue.create({
      name: "Deles",
      color: "#3478F6",
      companyId: other.id
    });
    await expectAppError(
      validateDefinition(1, definition(foreign.id)),
      "ERR_FLOW_INVALID_QUEUE"
    );
    await expect(validateDefinition(1, good)).resolves.toHaveProperty(
      "startId",
      "welcome"
    );
  });

  it("greets, shows the menu, saves the answer and transfers to the queue", async () => {
    const { ticket, contact, queue, say } = await setup();

    await expect(say("oi")).resolves.toBe(true);
    expect(sentBodies()).toEqual([
      "Olá, Paula! Bem-vindo à Loja.",
      "Como podemos ajudar?\n\n*1* - Comprar\n*2* - Horário"
    ]);
    expect((await ticket.reload()).flowStepId).toBe("menu");

    queued.mockClear();
    await say("1");
    expect(sentBodies()).toEqual(["Qual produto você procura?"]);

    queued.mockClear();
    await say("Tênis de corrida");
    const field = await ContactCustomField.findOne({
      where: { contactId: contact.id, name: "Produto" }
    });
    expect(field?.value).toBe("Tênis de corrida");
    expect(sentBodies()).toEqual(["Vou te passar para o comercial."]);

    await ticket.reload();
    expect(ticket.queueId).toBe(queue.id);
    expect(ticket.flowStepId).toBeNull();
    expect(ticket.flowFinishedAt).toBeTruthy();

    // Finished: later messages are for the team.
    await expect(say("alô")).resolves.toBe(false);
  });

  it("accepts the option text and closes when the flow says so", async () => {
    const { ticket, say } = await setup();
    await say("oi");
    queued.mockClear();

    await say("horário");
    expect(sentBodies()).toEqual([
      "Abrimos de segunda a sexta, das 9h às 18h."
    ]);
    expect((await ticket.reload()).status).toBe("closed");
  });

  it("repeats the menu on a wrong answer and gives up after three", async () => {
    const { ticket, say } = await setup();
    await say("oi");

    queued.mockClear();
    await say("9");
    expect(sentBodies()).toEqual([
      "Escolha uma opção da lista.",
      "Como podemos ajudar?\n\n*1* - Comprar\n*2* - Horário"
    ]);
    await say("banana");
    queued.mockClear();
    await say("??");
    expect(sentBodies()[0]).toContain("Uma pessoa da nossa equipe");

    await ticket.reload();
    expect(ticket.flowStepId).toBeNull();
    expect(ticket.flowFinishedAt).toBeTruthy();
    expect(ticket.queueId).toBeNull();
  });

  it("stays out of tickets an agent accepted and of connections without a flow", async () => {
    const { ticket, whatsapp, say } = await setup();
    await ticket.update({ userId: null, status: "open" });
    await expect(say("oi")).resolves.toBe(false);

    await ticket.update({ status: "pending" });
    await whatsapp.update({ flowId: null });
    await expect(say("oi")).resolves.toBe(false);
    expect(sentBodies()).toEqual([]);
  });
});
