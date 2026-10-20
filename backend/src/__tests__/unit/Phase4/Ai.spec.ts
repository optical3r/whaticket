import http from "http";
import { AddressInfo } from "net";
import faker from "faker";

import AppError from "../../../errors/AppError";
import { getAiSettings, updateAiSettings } from "../../../helpers/AiSettings";
import {
  getUsageSummary,
  resetAiClient,
  saveCompanyKey
} from "../../../libs/ai";
import Setting from "../../../models/Setting";
import {
  closeQueue,
  defineJob,
  enqueue,
  startWorker
} from "../../../libs/queue";
import AiUsage from "../../../models/AiUsage";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Plan from "../../../models/Plan";
import Ticket from "../../../models/Ticket";
import TicketNote from "../../../models/TicketNote";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import { ScheduleAssistantReply } from "../../../services/AiServices/AssistantService";
import {
  RewriteTextService,
  SuggestReplyService,
  SummarizeTicketService
} from "../../../services/AiServices/CopilotServices";
import {
  MAX_KNOWLEDGE_CHARACTERS,
  SaveKnowledgeService
} from "../../../services/AiServices/KnowledgeServices";
import SavePlanService from "../../../services/PlanService/SavePlanService";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import ListSettingsService from "../../../services/SettingServices/ListSettingsService";
import UpdateTicketService from "../../../services/TicketServices/UpdateTicketService";
import CreateUserService from "../../../services/UserServices/CreateUserService";
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

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    sendSeen: jest.fn().mockResolvedValue(undefined)
  }
}));

const sendMessage = whatsappProvider.sendMessage as jest.Mock;

// A stand-in for the Anthropic API: records requests and answers with
// whatever the test queued.
interface FakeReply {
  status?: number;
  text?: string;
  stopReason?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CLIENT_KEY = "sk-ant-api03-client-key-0000000000000000wxyz";
const BAD_KEY = "sk-ant-api03-revoked-key-000000000000000000000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requests: { headers: http.IncomingHttpHeaders; body: any }[] = [];
let replies: FakeReply[] = [];
let server: http.Server;

const reply = (...next: FakeReply[]) => {
  replies = next;
};

const answer = (data: Record<string, unknown>): FakeReply => ({
  text: JSON.stringify(data)
});

const waitFor = async (check: () => boolean | Promise<boolean>) => {
  const started = Date.now();
  // eslint-disable-next-line no-await-in-loop
  while (!(await check())) {
    if (Date.now() - started > 10000) throw new Error("Timed out");
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const createConversation = async (companyId = 1) => {
  const contact = await Contact.create({
    name: "Maria",
    number: faker.phone.phoneNumber("55119########"),
    companyId
  });
  const whatsapp = await Whatsapp.create({
    name: faker.random.uuid(),
    companyId
  });
  const ticket = await Ticket.create({
    contactId: contact.id,
    whatsappId: whatsapp.id,
    status: "pending",
    companyId
  });
  return { contact, whatsapp, ticket };
};

const customerSays = (ticket: Ticket, body: string) =>
  Message.create({
    id: faker.random.uuid(),
    ticketId: ticket.id,
    contactId: ticket.contactId,
    body,
    fromMe: false,
    mediaType: "chat"
  });

describe("Phase 4: AI", () => {
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", chunk => {
        raw += chunk;
      });
      req.on("end", () => {
        // Key check before saving a company key: a free model lookup.
        if (req.method === "GET" && req.url?.startsWith("/v1/models/")) {
          const valid = req.headers["x-api-key"] !== BAD_KEY;
          res.statusCode = valid ? 200 : 401;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify(
              valid
                ? { type: "model", id: "claude-opus-5-5" }
                : {
                    type: "error",
                    error: { type: "authentication_error", message: "bad" }
                  }
            )
          );
          return;
        }
        requests.push({ headers: req.headers, body: JSON.parse(raw) });
        const next = replies.shift() || { text: "ok" };
        res.setHeader("content-type", "application/json");
        if (next.status && next.status >= 400) {
          res.statusCode = next.status;
          res.end(
            JSON.stringify({
              type: "error",
              error: { type: "invalid_request_error", message: "bad" }
            })
          );
          return;
        }
        res.end(
          JSON.stringify({
            id: "msg_test",
            type: "message",
            role: "assistant",
            model: "claude-opus-5-5",
            content: [{ type: "text", text: next.text }],
            stop_reason: next.stopReason || "end_turn",
            stop_sequence: null,
            usage: {
              input_tokens: 100,
              output_tokens: 20,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0
            }
          })
        );
      });
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
    process.env.AI_ASSISTANT_DELAY_MS = "0";
  });

  beforeEach(async () => {
    await truncate();
    process.env.ANTHROPIC_API_KEY = "test-key";
    resetAiClient();
    requests.length = 0;
    replies = [];
    sendMessage.mockClear();
    await Plan.update(
      { aiEnabled: true, aiMonthlyRequests: 1000 },
      { where: { id: 1 } }
    );
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    await truncate();
    await disconnect();
  });

  describe("agent copilot", () => {
    it("suggests a reply from the conversation and the knowledge base", async () => {
      const { ticket } = await createConversation();
      await customerSays(ticket, "Qual o horário de vocês?");
      await SaveKnowledgeService(1, {
        title: "Horário",
        content: "Abrimos de segunda a sexta, das 9h às 18h."
      });
      reply({ text: "Atendemos de segunda a sexta, das 9h às 18h." });

      const text = await SuggestReplyService({
        ticketId: ticket.id,
        companyId: 1,
        userId: 1
      });

      expect(text).toBe("Atendemos de segunda a sexta, das 9h às 18h.");
      const [{ headers, body }] = requests;
      expect(headers["anthropic-beta"]).toContain(
        "server-side-fallback-2026-07-01"
      );
      expect(body.model).toBe("claude-opus-5-5");
      expect(body.fallbacks).toBe("default");
      expect(body.system[0].text).toContain("das 9h às 18h");
      expect(body.messages[0].content).toContain(
        "Cliente: Qual o horário de vocês?"
      );

      const usage = await AiUsage.findAll({ where: { companyId: 1 } });
      expect(usage).toHaveLength(1);
      expect(usage[0]).toMatchObject({
        feature: "suggest",
        inputTokens: 100,
        outputTokens: 20,
        ticketId: ticket.id
      });
    });

    it("does not read tickets of another company", async () => {
      const other = await CreateCompanyService({
        name: "Outra",
        planId: 1,
        adminName: "Admin",
        adminEmail: faker.internet.email(),
        adminPassword: "123456"
      });
      const { ticket } = await createConversation(other.id);
      await customerSays(ticket, "Oi");

      await expectAppError(
        SummarizeTicketService({
          ticketId: ticket.id,
          companyId: 1,
          userId: 1
        }),
        "ERR_NO_TICKET_FOUND"
      );
      expect(requests).toHaveLength(0);
    });

    it("validates the text to rewrite", async () => {
      await expectAppError(
        RewriteTextService({
          text: "oi",
          mode: "pirate",
          companyId: 1,
          userId: 1
        }),
        "ERR_AI_INVALID_MODE"
      );
      await expectAppError(
        RewriteTextService({
          text: " ",
          mode: "formal",
          companyId: 1,
          userId: 1
        }),
        "ERR_AI_EMPTY_TEXT"
      );
      reply({ text: "Bom dia. Como posso ajudar?" });
      await expect(
        RewriteTextService({
          text: "bom dia como posso ajudar",
          mode: "improve",
          companyId: 1,
          userId: 1
        })
      ).resolves.toBe("Bom dia. Como posso ajudar?");
    });

    it("explains a refusal instead of returning empty text", async () => {
      reply({ text: "", stopReason: "refusal" });
      await expectAppError(
        RewriteTextService({
          text: "oi",
          mode: "formal",
          companyId: 1,
          userId: 1
        }),
        "ERR_AI_REFUSED"
      );
    });
  });

  describe("client's own API key", () => {
    beforeEach(async () => {
      await Plan.update(
        { aiKeySource: "company", aiMonthlyRequests: 0 },
        { where: { id: 1 } }
      );
    });

    afterEach(async () => {
      await Plan.update({ aiKeySource: "platform" }, { where: { id: 1 } });
    });

    const rewrite = () =>
      RewriteTextService({
        text: "oi",
        mode: "formal",
        companyId: 1,
        userId: 1
      });

    it("asks for the company key and never uses the platform key", async () => {
      await expectAppError(rewrite(), "ERR_AI_KEY_MISSING");

      // Without a platform key the client's key still works.
      delete process.env.ANTHROPIC_API_KEY;
      await expect(saveCompanyKey(1, CLIENT_KEY)).resolves.toBe("wxyz");
      await expect(rewrite()).resolves.toBe("ok");

      expect(requests[0].headers["x-api-key"]).toBe(CLIENT_KEY);
      const [usage] = await AiUsage.findAll({ where: { companyId: 1 } });
      expect(usage.keySource).toBe("company");
    });

    it("rejects malformed or revoked keys and stores keys encrypted", async () => {
      await expectAppError(saveCompanyKey(1, "abc"), "ERR_AI_INVALID_KEY");
      await expectAppError(saveCompanyKey(1, BAD_KEY), "ERR_AI_INVALID_KEY");

      await saveCompanyKey(1, CLIENT_KEY);
      const stored = await Setting.findOne({
        where: { companyId: 1, key: "ai.apiKey" }
      });
      expect(stored?.value).toBeTruthy();
      expect(stored?.value).not.toContain("client-key");

      const general = await ListSettingsService(1);
      expect(general.some(setting => setting.key.startsWith("ai."))).toBe(
        false
      );
    });

    it("has no monthly limit and reports the company's own consumption", async () => {
      await saveCompanyKey(1, CLIENT_KEY);
      // Paid by the platform before the plan changed: not the client's.
      await AiUsage.create({
        companyId: 1,
        feature: "rewrite",
        keySource: "platform",
        model: "claude-opus-5-5",
        inputTokens: 999,
        outputTokens: 999
      });
      await rewrite();
      await rewrite();
      reply({ text: "Sugestão" });
      const { ticket } = await createConversation();
      await customerSays(ticket, "Oi");
      await SuggestReplyService({
        ticketId: ticket.id,
        companyId: 1,
        userId: 1
      });

      const summary = await getUsageSummary(1);
      expect(summary).toMatchObject({
        requests: 3,
        inputTokens: 300,
        outputTokens: 60
      });
      expect(
        summary.byFeature.find(row => row.feature === "rewrite")
      ).toMatchObject({ requests: 2 });
    });

    it("keeps the virtual assistant off until the company enters a key", async () => {
      await updateAiSettings(1, { assistantEnabled: true });
      const { ticket } = await createConversation();
      await customerSays(ticket, "Oi");

      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);
      await saveCompanyKey(1, CLIENT_KEY);
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(true);
    });
  });

  describe("limits", () => {
    it("blocks requests when AI is not configured, not in the plan or used up", async () => {
      const rewrite = () =>
        RewriteTextService({
          text: "oi",
          mode: "formal",
          companyId: 1,
          userId: 1
        });

      delete process.env.ANTHROPIC_API_KEY;
      await expectAppError(rewrite(), "ERR_AI_NOT_CONFIGURED");

      process.env.ANTHROPIC_API_KEY = "test-key";
      await Plan.update({ aiEnabled: false }, { where: { id: 1 } });
      await expectAppError(rewrite(), "ERR_AI_NOT_IN_PLAN");

      await Plan.update(
        { aiEnabled: true, aiMonthlyRequests: 0 },
        { where: { id: 1 } }
      );
      await expectAppError(rewrite(), "ERR_AI_NOT_IN_PLAN");

      await Plan.update({ aiMonthlyRequests: 5 }, { where: { id: 1 } });
      await updateAiSettings(1, { enabled: false });
      await expectAppError(rewrite(), "ERR_AI_DISABLED");
      await updateAiSettings(1, { enabled: true });

      await Plan.update({ aiMonthlyRequests: 1 }, { where: { id: 1 } });
      await expect(rewrite()).resolves.toBe("ok");
      await expectAppError(rewrite(), "ERR_AI_LIMIT_REACHED");
      expect(requests).toHaveLength(1);
    });

    it("lets the superadmin release AI per plan", async () => {
      const plan = await SavePlanService({
        name: "Básico",
        users: 3,
        connections: 1,
        queues: 2
      });
      expect(plan.aiEnabled).toBe(false);

      const updated = await SavePlanService(
        {
          name: "Básico",
          users: 3,
          connections: 1,
          queues: 2,
          aiEnabled: true,
          aiMonthlyRequests: 300
        },
        plan.id
      );
      expect(updated).toMatchObject({
        aiEnabled: true,
        aiMonthlyRequests: 300
      });

      // Saving without the AI fields keeps them.
      const kept = await SavePlanService(
        { name: "Básico", users: 4, connections: 1, queues: 2 },
        plan.id
      );
      expect(kept).toMatchObject({ aiEnabled: true, aiMonthlyRequests: 300 });
    });
  });

  describe("settings and knowledge base", () => {
    it("validates settings and keeps them out of the general settings list", async () => {
      await expectAppError(
        updateAiSettings(1, { maxReplies: 0 }),
        "ERR_AI_INVALID_SETTINGS"
      );

      const saved = await updateAiSettings(1, {
        assistantEnabled: "true" as unknown as boolean,
        maxReplies: "3" as unknown as number,
        assistantName: "  Luna  "
      });
      expect(saved).toMatchObject({
        assistantEnabled: true,
        maxReplies: 3,
        assistantName: "Luna"
      });

      const general = await ListSettingsService(1);
      expect(general.some(setting => setting.key.startsWith("ai."))).toBe(
        false
      );
    });

    it("caps the knowledge base size and isolates companies", async () => {
      const big = "x".repeat(19000);
      const count = Math.floor(MAX_KNOWLEDGE_CHARACTERS / 19010);
      for (let i = 0; i < count; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await SaveKnowledgeService(1, { title: `Artigo ${i}`, content: big });
      }
      await expectAppError(
        SaveKnowledgeService(1, { title: "Mais um", content: big }),
        "ERR_KNOWLEDGE_TOO_LARGE"
      );
      // Inactive articles do not go to the AI, so they do not count.
      await expect(
        SaveKnowledgeService(1, {
          title: "Rascunho",
          content: big,
          active: false
        })
      ).resolves.toHaveProperty("active", false);

      const other = await CreateCompanyService({
        name: "Outra",
        planId: 1,
        adminName: "Admin",
        adminEmail: faker.internet.email(),
        adminPassword: "123456"
      });
      const foreign = await SaveKnowledgeService(other.id, {
        title: "Segredo",
        content: "Só da outra empresa"
      });
      await expectAppError(
        SaveKnowledgeService(1, { title: "Meu", content: "x" }, foreign.id),
        "ERR_KNOWLEDGE_NOT_FOUND"
      );
    });
  });

  describe("virtual assistant", () => {
    beforeEach(async () => {
      await updateAiSettings(1, { assistantEnabled: true, maxReplies: 2 });
    });

    it("answers a waiting customer", async () => {
      const { ticket, contact } = await createConversation();
      await customerSays(ticket, "Vocês abrem sábado?");
      reply(
        answer({
          reply: "Abrimos aos sábados das 9h às 13h.",
          handoff: false,
          reason: ""
        })
      );

      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(true);
      await waitFor(() => sendMessage.mock.calls.length === 1);

      expect(sendMessage).toHaveBeenCalledWith(
        ticket.whatsappId,
        `${contact.number}@c.us`,
        "\u200eAbrimos aos sábados das 9h às 13h."
      );
      expect(requests[0].body.output_config.format.type).toBe("json_schema");
      await ticket.reload();
      expect(ticket.aiReplies).toBe(1);
      expect(ticket.aiHandoffAt).toBeNull();
    });

    it("hands the conversation to the team and leaves a note", async () => {
      const { ticket } = await createConversation();
      await customerSays(ticket, "Quero cancelar meu contrato");
      reply(
        answer({ reply: "", handoff: true, reason: "Pedido de cancelamento." })
      );

      await ScheduleAssistantReply(ticket);
      await waitFor(async () => Boolean((await ticket.reload()).aiHandoffAt));
      await waitFor(() => sendMessage.mock.calls.length === 1);

      const settings = await getAiSettings(1);
      expect(sendMessage.mock.calls[0][2]).toBe(
        `\u200e${settings.handoffMessage}`
      );
      const note = await TicketNote.findOne({ where: { ticketId: ticket.id } });
      expect(note?.body).toContain("Pedido de cancelamento.");

      // After the handoff it stays quiet on this ticket.
      await customerSays(ticket, "Alô?");
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);
    });

    it("hands off when the AI request fails, so the customer is not left waiting", async () => {
      const { ticket } = await createConversation();
      await customerSays(ticket, "Oi");
      reply({ status: 400 });

      await ScheduleAssistantReply(ticket);
      await waitFor(async () => Boolean((await ticket.reload()).aiHandoffAt));
    });

    it("stops after the reply limit without calling the API", async () => {
      const { ticket } = await createConversation();
      await ticket.update({ aiReplies: 2 });
      await customerSays(ticket, "Mais uma pergunta");

      await ScheduleAssistantReply(ticket);
      await waitFor(async () => Boolean((await ticket.reload()).aiHandoffAt));
      expect(requests).toHaveLength(0);
    });

    it("stays out of tickets an agent accepted, groups and disabled companies", async () => {
      const { ticket } = await createConversation();
      await customerSays(ticket, "Oi");

      const agent = await CreateUserService({
        name: "Ana",
        email: faker.internet.email(),
        password: "123456",
        profile: "user",
        companyId: 1
      });
      await ticket.update({ userId: agent.id });
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);

      await ticket.update({ userId: null, isGroup: true });
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);

      await ticket.update({ isGroup: false });
      await updateAiSettings(1, { enabled: false });
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);

      await updateAiSettings(1, { enabled: true });
      await Plan.update({ aiEnabled: false }, { where: { id: 1 } });
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);

      await Plan.update({ aiEnabled: true }, { where: { id: 1 } });
      await updateAiSettings(1, { assistantEnabled: false });
      await expect(ScheduleAssistantReply(ticket)).resolves.toBe(false);
      expect(requests).toHaveLength(0);
    });

    it("steps back when an agent already answered from the phone", async () => {
      const { ticket } = await createConversation();
      await Message.create({
        id: faker.random.uuid(),
        ticketId: ticket.id,
        body: "Oi Maria, aqui é o João",
        fromMe: true,
        mediaType: "chat"
      });
      await customerSays(ticket, "Oi João");

      await ScheduleAssistantReply(ticket);
      await waitFor(async () => Boolean((await ticket.reload()).aiHandoffAt));
      expect(requests).toHaveLength(0);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it("is available again after the ticket is closed", async () => {
      const { ticket } = await createConversation();
      await ticket.update({ aiHandoffAt: new Date(), aiReplies: 2 });

      await UpdateTicketService({
        ticketData: { status: "closed" },
        ticketId: ticket.id,
        companyId: 1
      });

      await ticket.reload();
      expect(ticket.aiHandoffAt).toBeNull();
      expect(ticket.aiReplies).toBe(0);
    });
  });

  describe("job deduplication without Redis", () => {
    it("merges messages that arrive while a reply is waiting or running", async () => {
      let runs = 0;
      let release: () => void = () => undefined;
      defineJob("test.dedupe", async () => {
        runs += 1;
        if (runs === 1) {
          await new Promise<void>(resolve => {
            release = resolve;
          });
        }
      });

      await enqueue("test.dedupe", {}, { delay: 20, dedupeKey: "t1" });
      await enqueue("test.dedupe", {}, { delay: 20, dedupeKey: "t1" });
      await waitFor(() => runs === 1);

      // Two more while the first runs: only one extra run.
      await enqueue("test.dedupe", {}, { delay: 20, dedupeKey: "t1" });
      await enqueue("test.dedupe", {}, { delay: 20, dedupeKey: "t1" });
      release();
      await waitFor(() => runs === 2);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(runs).toBe(2);
    });
  });

  // Needs a Redis server: CI sets REDIS_TEST_URL.
  const redisUrl = process.env.REDIS_TEST_URL;
  (redisUrl ? describe : describe.skip)("job deduplication with Redis", () => {
    beforeAll(() => {
      process.env.REDIS_URL = redisUrl;
      startWorker();
    });

    afterAll(async () => {
      await closeQueue();
      delete process.env.REDIS_URL;
    });

    it("runs one delayed job for messages that arrive together", async () => {
      const seen: number[] = [];
      defineJob<{ n: number }>("test.redisDedupe", async ({ n }) => {
        seen.push(n);
      });

      const key = `ticket-${Date.now()}`;
      await enqueue(
        "test.redisDedupe",
        { n: 1 },
        { delay: 300, dedupeKey: key }
      );
      await enqueue(
        "test.redisDedupe",
        { n: 2 },
        { delay: 300, dedupeKey: key }
      );
      await waitFor(() => seen.length === 1);
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(seen).toEqual([1]);
    });
  });
});
