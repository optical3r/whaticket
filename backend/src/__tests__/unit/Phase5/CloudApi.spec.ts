import crypto from "crypto";
import http from "http";
import { AddressInfo } from "net";
import express from "express";
import request from "supertest";
import faker from "faker";
import { subHours } from "date-fns";

import AppError from "../../../errors/AppError";
import { publicCloudInfo } from "../../../helpers/CloudApiCredentials";
import jsonBody from "../../../middleware/jsonBody";
import CloudApiCredential from "../../../models/CloudApiCredential";
import Company from "../../../models/Company";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import cloudWebhookRoutes from "../../../routes/cloudWebhookRoutes";
import CreateWhatsAppService from "../../../services/WhatsappService/CreateWhatsAppService";
import SendTemplateService from "../../../services/WbotServices/SendTemplateService";
import SendWhatsAppMessage from "../../../services/WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
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

const PHONE_ID = "1098765432101";
const WABA_ID = "2098765432102";
const TOKEN = "EAAG-test-access-token-0000000000";
const APP_SECRET = "app-secret-0000000000000000";

// A stand-in for Meta's Graph API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphCalls: { method: string; url: string; body: any }[] = [];
let graph: http.Server;
let graphBase = "";

const webhookApp = express();
webhookApp.use(jsonBody);
webhookApp.use(cloudWebhookRoutes);

const sign = (raw: string, secret = APP_SECRET) =>
  `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;

const waitFor = async (check: () => Promise<boolean>) => {
  const started = Date.now();
  // eslint-disable-next-line no-await-in-loop
  while (!(await check())) {
    if (Date.now() - started > 5000) throw new Error("Timed out");
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

const createCloudConnection = async () => {
  const { whatsapp } = await CreateWhatsAppService({
    name: faker.random.uuid(),
    channel: "cloudapi",
    cloud: {
      phoneNumberId: PHONE_ID,
      wabaId: WABA_ID,
      accessToken: TOKEN,
      appSecret: APP_SECRET
    },
    companyId: 1
  });
  await whatsappProvider.init(whatsapp);
  await whatsapp.reload();
  return whatsapp;
};

const inbound = (
  from: string,
  text: string,
  id = `wamid.${faker.random.uuid()}`
) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: PHONE_ID },
            contacts: [{ wa_id: from, profile: { name: "Ana Cliente" } }],
            messages: [
              {
                from,
                id,
                timestamp: "1760000000",
                type: "text",
                text: { body: text }
              }
            ]
          }
        }
      ]
    }
  ]
});

const deliver = (whatsappId: number, payload: unknown, secret = APP_SECRET) => {
  const raw = JSON.stringify(payload);
  return request(webhookApp)
    .post(`/webhooks/whatsapp-cloud/${whatsappId}`)
    .set("Content-Type", "application/json")
    .set("X-Hub-Signature-256", sign(raw, secret))
    .send(raw);
};

describe("Phase 5: WhatsApp Cloud API", () => {
  beforeAll(async () => {
    graph = http.createServer((req, res) => {
      let raw = "";
      req.on("data", chunk => {
        raw += chunk;
      });
      req.on("end", () => {
        const url = req.url || "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          // multipart upload
        }
        graphCalls.push({ method: req.method || "", url, body });
        res.setHeader("content-type", "application/json");
        if (req.headers.authorization !== `Bearer ${TOKEN}`) {
          res.statusCode = 401;
          res.end(
            JSON.stringify({ error: { code: 190, message: "bad token" } })
          );
          return;
        }
        if (url.startsWith(`/${PHONE_ID}?`)) {
          res.end(JSON.stringify({ display_phone_number: "+55 11 4000-0000" }));
        } else if (url === `/${PHONE_ID}/messages`) {
          res.end(
            JSON.stringify({
              messages: [{ id: `wamid.out.${graphCalls.length}` }]
            })
          );
        } else if (url.startsWith(`/${WABA_ID}/message_templates`)) {
          res.end(
            JSON.stringify({
              data: [
                {
                  name: "retomar_contato",
                  language: "pt_BR",
                  status: "APPROVED",
                  category: "UTILITY",
                  components: [
                    {
                      type: "BODY",
                      text: "Olá, {{1}}! Podemos continuar o atendimento?"
                    }
                  ]
                },
                {
                  name: "rascunho",
                  language: "pt_BR",
                  status: "PENDING",
                  category: "MARKETING",
                  components: [{ type: "BODY", text: "Oferta" }]
                }
              ]
            })
          );
        } else {
          res.statusCode = 404;
          res.end(
            JSON.stringify({ error: { code: 100, message: "not found" } })
          );
        }
      });
    });
    await new Promise<void>(resolve => graph.listen(0, "127.0.0.1", resolve));
    graphBase = `http://127.0.0.1:${(graph.address() as AddressInfo).port}`;
    process.env.WHATSAPP_CLOUD_API_URL = graphBase;
  });

  beforeEach(async () => {
    await truncate();
    graphCalls.length = 0;
  });

  afterAll(async () => {
    await new Promise(resolve => graph.close(resolve));
    delete process.env.WHATSAPP_CLOUD_API_URL;
    await truncate();
    await disconnect();
  });

  it("creates a connection without QR code terms and keeps secrets encrypted", async () => {
    await Company.update({ termsAcceptedAt: null }, { where: { id: 1 } });
    const whatsapp = await createCloudConnection();

    expect(whatsapp.channel).toBe("cloudapi");
    expect(whatsapp.status).toBe("CONNECTED");

    const row = await CloudApiCredential.findByPk(whatsapp.id);
    expect(row?.accessToken).not.toContain("EAAG");
    expect(row?.appSecret).not.toContain("app-secret");
    expect(row?.displayPhoneNumber).toBe("+55 11 4000-0000");

    const info = await publicCloudInfo(whatsapp.id);
    expect(info).toMatchObject({ phoneNumberId: PHONE_ID, wabaId: WABA_ID });
    expect(JSON.stringify(info)).not.toContain(TOKEN);
  });

  it("refuses incomplete credentials and does not leave the connection behind", async () => {
    await expect(
      CreateWhatsAppService({
        name: "Oficial",
        channel: "cloudapi",
        cloud: { phoneNumberId: PHONE_ID, wabaId: WABA_ID },
        companyId: 1
      })
    ).rejects.toHaveProperty("message", "ERR_CLOUD_INVALID_CREDENTIALS");
    expect(await Whatsapp.count({ where: { companyId: 1 } })).toBe(0);
  });

  it("answers Meta's verification and rejects unsigned deliveries", async () => {
    const whatsapp = await createCloudConnection();
    const row = await CloudApiCredential.findByPk(whatsapp.id);

    const ok = await request(webhookApp)
      .get(`/webhooks/whatsapp-cloud/${whatsapp.id}`)
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": row?.verifyToken,
        "hub.challenge": "42"
      });
    expect(ok.status).toBe(200);
    expect(ok.text).toBe("42");

    const wrong = await request(webhookApp)
      .get(`/webhooks/whatsapp-cloud/${whatsapp.id}`)
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": "nope",
        "hub.challenge": "42"
      });
    expect(wrong.status).toBe(403);

    const forged = await deliver(
      whatsapp.id,
      inbound("5511987650000", "oi"),
      "other-secret"
    );
    expect(forged.status).toBe(401);
    expect(await Message.count()).toBe(0);
  });

  it("turns a delivery into a ticket and sends replies through the Graph API", async () => {
    const whatsapp = await createCloudConnection();
    const delivered = await deliver(
      whatsapp.id,
      inbound("5511987650000", "Quero um orçamento")
    );
    expect(delivered.status).toBe(200);

    await waitFor(async () => (await Message.count()) === 1);
    const contact = await Contact.findOne({
      where: { number: "5511987650000" }
    });
    expect(contact?.name).toBe("Ana Cliente");
    const ticket = await Ticket.findOne({ where: { contactId: contact!.id } });
    expect(ticket?.lastInboundAt).toBeTruthy();

    const full = await ShowTicketService(ticket!.id, 1);
    await SendWhatsAppMessage({ body: "Claro! Qual produto?", ticket: full });

    const sent = graphCalls.find(call => call.url === `/${PHONE_ID}/messages`);
    expect(sent?.body).toMatchObject({
      messaging_product: "whatsapp",
      to: "5511987650000",
      type: "text",
      text: { body: "Claro! Qual produto?" }
    });
    // Meta does not echo sent messages: the provider stores them.
    const stored = await Message.findOne({ where: { fromMe: true } });
    expect(stored?.body).toBe("Claro! Qual produto?");
    expect(stored?.ticketId).toBe(ticket!.id);

    // Status updates move the ticks.
    await deliver(whatsapp.id, {
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: PHONE_ID },
                statuses: [{ id: stored!.id, status: "read" }]
              }
            }
          ]
        }
      ]
    });
    await waitFor(async () => (await stored!.reload()).ack === 3);
  });

  it("allows only approved templates after 24 hours without a customer message", async () => {
    const whatsapp = await createCloudConnection();
    await deliver(whatsapp.id, inbound("5511987650000", "Oi"));
    await waitFor(async () => (await Message.count()) === 1);
    const ticket = await Ticket.findOne();
    await ticket!.update({ lastInboundAt: subHours(new Date(), 25) });
    const full = await ShowTicketService(ticket!.id, 1);

    const late = SendWhatsAppMessage({ body: "Ainda está aí?", ticket: full });
    await expect(late).rejects.toBeInstanceOf(AppError);
    await expect(late).rejects.toHaveProperty(
      "message",
      "ERR_CLOUD_WINDOW_CLOSED"
    );

    await expect(
      SendTemplateService({
        ticket: full,
        name: "rascunho",
        language: "pt_BR",
        params: []
      })
    ).rejects.toHaveProperty("message", "ERR_CLOUD_TEMPLATE_NOT_FOUND");
    await expect(
      SendTemplateService({
        ticket: full,
        name: "retomar_contato",
        language: "pt_BR",
        params: []
      })
    ).rejects.toHaveProperty("message", "ERR_CLOUD_TEMPLATE_PARAMS");

    await SendTemplateService({
      ticket: full,
      name: "retomar_contato",
      language: "pt_BR",
      params: ["Ana"]
    });
    const call = graphCalls
      .filter(item => item.url === `/${PHONE_ID}/messages`)
      .pop();
    expect(call?.body.template).toMatchObject({
      name: "retomar_contato",
      language: { code: "pt_BR" },
      components: [
        { type: "body", parameters: [{ type: "text", text: "Ana" }] }
      ]
    });
    const stored = await Message.findOne({ where: { fromMe: true } });
    expect(stored?.body).toBe("Olá, Ana! Podemos continuar o atendimento?");
  });

  it("marks the connection down when Meta rejects the token", async () => {
    const whatsapp = await createCloudConnection();
    await CloudApiCredential.update(
      {
        accessToken: (
          await import("../../../helpers/SecretBox")
        ).encryptSecret("EAAG-revoked-token-000000000000")
      },
      { where: { whatsappId: whatsapp.id } }
    );
    await whatsappProvider.init(whatsapp);
    await whatsapp.reload();
    expect(whatsapp.status).toBe("DISCONNECTED");
  });
});
