import crypto from "crypto";
import http from "http";
import { AddressInfo } from "net";
import express from "express";
import request from "supertest";
import faker from "faker";

import { publicCloudInfo } from "../../../helpers/CloudApiCredentials";
import {
  getCoexyAccess,
  isCoexyReady,
  saveCoexyKey,
  setupCoexyWebhook
} from "../../../libs/coexy";
import jsonBody from "../../../middleware/jsonBody";
import CloudApiCredential from "../../../models/CloudApiCredential";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Plan from "../../../models/Plan";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import cloudWebhookRoutes from "../../../routes/cloudWebhookRoutes";
import { SyncCoexyChannel } from "../../../services/CoexyServices/CoexyChannelService";
import CreateWhatsAppService from "../../../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../../../services/WhatsappService/DeleteWhatsAppService";
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

const API_KEY = "crt_pk_test_0000000000000000";
const HMAC_SECRET = "coexy-hmac-secret-000000000000";
const PHONE_ID = "3098765432103";
const WABA_ID = "4098765432104";

interface FakeChannel {
  id: string;
  name: string;
  status: string;
  phone_number_id: string | null;
  waba_id: string | null;
  display_phone_number: string | null;
  channel_token: string;
  connect_url: string;
  verification: Record<string, unknown>;
}

// A stand-in for Coexy: management API (/api) and Graph API proxy
// (/meta-proxy), as docs/coexy-spec.md describes them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const calls: { method: string; url: string; auth?: string; body: any }[] = [];
const channels = new Map<string, FakeChannel>();
const fake = {
  rateLimitOnce: false,
  mediaFails: false,
  mediaExpiresOnce: false
};
let server: http.Server;
let base = "";

const webhookApp = express();
webhookApp.use(jsonBody);
webhookApp.use(cloudWebhookRoutes);

const sign = (raw: string, secret = HMAC_SECRET) =>
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

const send = (
  res: http.ServerResponse,
  status: number,
  body?: unknown,
  headers: Record<string, string> = {}
) => {
  res.statusCode = status;
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  if (body === undefined) {
    res.end();
    return;
  }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

const handleApi = (
  method: string,
  path: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  res: http.ServerResponse
) => {
  if (method === "GET" && path === "/channels") {
    send(res, 200, [...channels.values()]);
  } else if (method === "POST" && path === "/channels") {
    const id = faker.random.uuid();
    const channel: FakeChannel = {
      id,
      name: body.name,
      status: "pending",
      phone_number_id: null,
      waba_id: null,
      display_phone_number: null,
      channel_token: `chn_${id}`,
      connect_url: `https://app.coexy.test/connect/${id}`,
      verification: {
        status: "not_verified",
        attempts: 0,
        max_attempts: 3,
        rejection_reasons: null,
        verified_at: null,
        url: `https://app.coexy.test/verify/${id}`
      }
    };
    channels.set(id, channel);
    send(res, 201, channel);
  } else if (path.startsWith("/channels/")) {
    const id = path.split("/")[2].split("?")[0];
    const channel = channels.get(id);
    if (!channel) {
      send(res, 404, { error: "Channel not found" });
    } else if (method === "GET") {
      send(res, 200, channel);
    } else if (method === "DELETE") {
      if (channel.status === "active" && !path.includes("force=true")) {
        send(res, 409, { error: "Channel is active. Use ?force=true" });
        return;
      }
      channels.delete(id);
      send(res, 204);
    }
  } else if (method === "POST" && path === "/webhooks") {
    if (!String(body.url).startsWith("https://")) {
      send(res, 422, { error: '"url" must start with https://' });
      return;
    }
    send(res, 201, {
      id: "wh_1",
      name: body.name,
      url: body.url,
      events: body.events,
      status: "active",
      hmac_secret: HMAC_SECRET,
      scope: "org",
      channel_ids: []
    });
  } else if (method === "DELETE" && path.startsWith("/webhooks/")) {
    send(res, 204);
  } else {
    send(res, 404, { error: "Not found" });
  }
};

const handleProxy = (
  method: string,
  path: string,
  auth: string,
  res: http.ServerResponse
) => {
  const channel = [...channels.values()].find(
    item => auth === `Bearer ${item.channel_token}`
  );
  if (!channel) {
    send(res, 401, { error: "Invalid channel token" });
    return;
  }
  if (channel.status === "disconnected") {
    send(res, 503, { error: "CHANNEL_DISCONNECTED" });
    return;
  }
  if (fake.rateLimitOnce) {
    fake.rateLimitOnce = false;
    send(res, 429, { error: "Rate limit exceeded" }, { "Retry-After": "1" });
    return;
  }
  if (method === "POST" && path === `/${channel.phone_number_id}/messages`) {
    send(res, 200, { messages: [{ id: `wamid.out.${calls.length}` }] });
  } else if (method === "GET" && path === "/media-1") {
    send(res, 200, {
      url: `${base}/files/media-1`,
      mime_type: "image/jpeg"
    });
  } else {
    send(res, 404, { error: { code: 100, message: "not found" } });
  }
};

const createCoexyConnection = async (name = faker.random.uuid()) => {
  const { whatsapp } = await CreateWhatsAppService({
    name,
    channel: "cloudapi",
    cloud: { provider: "coexy" },
    companyId: 1
  });
  await whatsappProvider.init(whatsapp);
  return whatsapp.reload();
};

// The company finishes connecting its number from the link.
const connectNumber = async (whatsappId: number) => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  const channel = channels.get(row!.coexyChannelId as string)!;
  Object.assign(channel, {
    status: "active",
    phone_number_id: PHONE_ID,
    waba_id: WABA_ID,
    display_phone_number: "+55 11 4000-1111"
  });
  await SyncCoexyChannel(whatsappId);
  return channel;
};

const event = (
  field: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>,
  phoneNumberId = PHONE_ID
) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: WABA_ID,
      changes: [
        {
          field,
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "551140001111",
              phone_number_id: phoneNumberId
            },
            ...value
          }
        }
      ]
    }
  ]
});

const textFrom = (
  from: string,
  body: string,
  id = `wamid.${faker.random.uuid()}`
) =>
  event("messages", {
    contacts: [{ wa_id: from, profile: { name: "Bia Cliente" } }],
    messages: [
      { from, id, timestamp: "1760000000", type: "text", text: { body } }
    ]
  });

const deliver = (payload: unknown, secret = HMAC_SECRET) => {
  const raw = JSON.stringify(payload);
  return request(webhookApp)
    .post("/webhooks/coexy")
    .set("Content-Type", "application/json")
    .set("X-Coexy-Signature", sign(raw, secret))
    .send(raw);
};

let originalPlan: Partial<Plan>;

describe("Phase 6: official API through Coexy", () => {
  beforeAll(async () => {
    server = http.createServer((req, res) => {
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
          // empty or multipart
        }
        const auth = String(req.headers.authorization || "");
        calls.push({ method: req.method || "", url, auth, body });

        if (url.startsWith("/api/")) {
          if (req.headers["x-api-key"] !== API_KEY) {
            send(res, 401, { error: "Invalid or revoked API key" });
            return;
          }
          handleApi(req.method || "", url.slice(4), body, res);
        } else if (url.startsWith("/meta-proxy/")) {
          handleProxy(req.method || "", url.slice(11), auth, res);
        } else if (url === "/files/media-1") {
          if (fake.mediaFails || fake.mediaExpiresOnce) {
            fake.mediaExpiresOnce = false;
            send(res, 403, { error: "forbidden" });
            return;
          }
          res.setHeader("content-type", "image/jpeg");
          res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
        } else {
          send(res, 404, { error: "Not found" });
        }
      });
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    process.env.COEXY_API_URL = base;
    process.env.COEXY_WEBHOOK_URL = "https://api.exemplo.com.br/webhooks/coexy";

    const plan = await Plan.findByPk(1);
    originalPlan = {
      connections: plan!.connections,
      coexyEnabled: plan!.coexyEnabled,
      coexyMaxChannels: plan!.coexyMaxChannels
    };
  });

  beforeEach(async () => {
    await truncate();
    calls.length = 0;
    channels.clear();
    fake.rateLimitOnce = false;
    fake.mediaFails = false;
    fake.mediaExpiresOnce = false;
    await Plan.update(
      { connections: 10, coexyEnabled: true, coexyMaxChannels: 2 },
      { where: { id: 1 } }
    );
    await saveCoexyKey(API_KEY);
    await setupCoexyWebhook();
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    delete process.env.COEXY_API_URL;
    delete process.env.COEXY_WEBHOOK_URL;
    await truncate();
    await Plan.update(originalPlan, { where: { id: 1 } });
    await disconnect();
  });

  it("checks the platform key and keeps the webhook secret it gets once", async () => {
    await expect(
      saveCoexyKey("crt_pk_wrong_000000000000")
    ).rejects.toHaveProperty("message", "ERR_COEXY_INVALID_KEY");
    expect(await isCoexyReady()).toBe(true);
    const webhook = calls.find(
      call => call.method === "POST" && call.url === "/api/webhooks"
    );
    expect(webhook?.body).toMatchObject({
      url: "https://api.exemplo.com.br/webhooks/coexy",
      events: ["messages", "smb_message_echoes", "channel_health_update"]
    });

    process.env.COEXY_WEBHOOK_URL = "http://localhost:8080/webhooks/coexy";
    await expect(setupCoexyWebhook()).rejects.toHaveProperty(
      "message",
      "ERR_COEXY_WEBHOOK_HTTPS"
    );
    process.env.COEXY_WEBHOOK_URL = "https://api.exemplo.com.br/webhooks/coexy";
  });

  it("creates a channel per connection, within the plan", async () => {
    await Plan.update({ coexyEnabled: false }, { where: { id: 1 } });
    await expect(createCoexyConnection()).rejects.toHaveProperty(
      "message",
      "ERR_COEXY_NOT_IN_PLAN"
    );

    await Plan.update(
      { coexyEnabled: true, coexyMaxChannels: 1 },
      { where: { id: 1 } }
    );
    const whatsapp = await createCoexyConnection();
    expect(whatsapp.status).toBe("PENDING");

    const info = await publicCloudInfo(whatsapp.id);
    expect(info).toMatchObject({
      provider: "coexy",
      coexyStatus: "pending",
      phoneNumberId: null
    });
    expect(String(info?.connectUrl)).toContain("/connect/");
    expect(JSON.stringify(info)).not.toContain("chn_");

    // The channel token is stored encrypted.
    const row = await CloudApiCredential.findByPk(whatsapp.id);
    expect(row?.accessToken).not.toContain("chn_");

    await expect(createCoexyConnection()).rejects.toHaveProperty(
      "message",
      "ERR_COEXY_LIMIT_REACHED"
    );
    expect(await getCoexyAccess(1)).toMatchObject({ used: 1, max: 1 });
    expect(await Whatsapp.count()).toBe(1);
  });

  it("connects when Coexy reports the number and sends through the proxy", async () => {
    const whatsapp = await createCoexyConnection();
    const channel = await connectNumber(whatsapp.id);
    expect((await whatsapp.reload()).status).toBe("CONNECTED");
    expect(await publicCloudInfo(whatsapp.id)).toMatchObject({
      phoneNumberId: PHONE_ID,
      wabaId: WABA_ID,
      displayPhoneNumber: "+55 11 4000-1111"
    });

    await deliver(textFrom("5511987651111", "Oi, tudo bem?"));
    await waitFor(async () => (await Message.count()) === 1);
    const ticket = await Ticket.findOne();
    const full = await ShowTicketService(ticket!.id, 1);

    // A 429 waits for Retry-After and tries again, with the same key.
    fake.rateLimitOnce = true;
    await SendWhatsAppMessage({ body: "Tudo, e com você?", ticket: full });

    const sends = calls.filter(
      call => call.url === `/meta-proxy/${PHONE_ID}/messages`
    );
    expect(sends).toHaveLength(2);
    expect(sends[0].auth).toBe(`Bearer ${channel.channel_token}`);
    expect(sends[1].body).toMatchObject({
      messaging_product: "whatsapp",
      to: "5511987651111",
      type: "text",
      text: { body: "Tudo, e com você?" }
    });
    expect(sends[1].body.idempotency_key).toBeTruthy();
    expect(sends[1].body.idempotency_key).toBe(sends[0].body.idempotency_key);
    expect(await Message.count({ where: { fromMe: true } })).toBe(1);
  }, 15000);

  it("accepts only signed events and routes them by number", async () => {
    const whatsapp = await createCoexyConnection();
    await connectNumber(whatsapp.id);

    const forged = await deliver(textFrom("5511987652222", "oi"), "nope");
    expect(forged.status).toBe(401);

    // The per-connection Meta address never takes Coexy connections, even
    // signed with an empty secret.
    const raw = JSON.stringify(textFrom("5511987652222", "oi"));
    const meta = await request(webhookApp)
      .post(`/webhooks/whatsapp-cloud/${whatsapp.id}`)
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(raw, ""))
      .send(raw);
    expect(meta.status).toBe(401);

    const unknown = await deliver(
      event(
        "messages",
        {
          messages: [
            {
              from: "5511987652222",
              id: "wamid.other",
              timestamp: "1760000000",
              type: "text",
              text: { body: "outro número" }
            }
          ]
        },
        "9999999999999"
      )
    );
    expect(unknown.status).toBe(200);

    const id = `wamid.${faker.random.uuid()}`;
    const ok = await deliver(textFrom("5511987652222", "Preciso de ajuda", id));
    expect(ok.status).toBe(200);
    await waitFor(async () => (await Message.count()) === 1);

    // Coexy retries deliveries: the same message is stored once.
    await deliver(textFrom("5511987652222", "Preciso de ajuda", id));
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(await Message.count()).toBe(1);
    const ticket = await Ticket.findOne();
    expect(ticket?.whatsappId).toBe(whatsapp.id);
  });

  it("stores messages sent from the WhatsApp Business app (coexistence)", async () => {
    const whatsapp = await createCoexyConnection();
    await connectNumber(whatsapp.id);

    await deliver(
      event("smb_message_echoes", {
        message_echoes: [
          {
            from: "551140001111",
            to: "5511987653333",
            id: "wamid.echo.1",
            timestamp: "1760000100",
            type: "text",
            text: { body: "Enviado pelo celular" }
          }
        ]
      })
    );
    await waitFor(async () => (await Message.count()) === 1);
    const message = await Message.findByPk("wamid.echo.1");
    expect(message?.fromMe).toBe(true);
    expect(message?.body).toBe("Enviado pelo celular");
    const contact = await Contact.findOne({
      where: { number: "5511987653333" }
    });
    expect(contact).toBeTruthy();
  });

  it("downloads media in two steps through the proxy, with the channel token", async () => {
    const whatsapp = await createCoexyConnection();
    const channel = await connectNumber(whatsapp.id);
    // The first address expired before the download: a new one is asked.
    fake.mediaExpiresOnce = true;

    await deliver(
      event("messages", {
        contacts: [{ wa_id: "5511987656666", profile: { name: "Duda" } }],
        messages: [
          {
            from: "5511987656666",
            id: "wamid.img.2",
            timestamp: "1760000300",
            type: "image",
            image: { id: "media-1", mime_type: "image/jpeg" }
          }
        ]
      })
    );
    await waitFor(async () => (await Message.count()) === 1);
    const message = await Message.findByPk("wamid.img.2");
    expect(message?.mediaType).toBe("image");
    expect(message?.getDataValue("mediaUrl")).toBeTruthy();

    const lookups = calls.filter(call => call.url === "/meta-proxy/media-1");
    const files = calls.filter(call => call.url === "/files/media-1");
    expect(lookups).toHaveLength(2);
    expect(files).toHaveLength(2);
    expect(files[1].auth).toBe(`Bearer ${channel.channel_token}`);
  });

  it("keeps a message whose file cannot be downloaded", async () => {
    const whatsapp = await createCoexyConnection();
    await connectNumber(whatsapp.id);
    fake.mediaFails = true;

    await deliver(
      event("messages", {
        contacts: [{ wa_id: "5511987654444", profile: { name: "Caio" } }],
        messages: [
          {
            from: "5511987654444",
            id: "wamid.img.1",
            timestamp: "1760000200",
            type: "image",
            image: { id: "media-1", mime_type: "image/jpeg", caption: "Nota" }
          }
        ]
      })
    );
    await waitFor(async () => (await Message.count()) === 1);
    const message = await Message.findByPk("wamid.img.1");
    expect(message?.body).toContain("Nota");
    expect(message?.body).toContain("não foi possível baixá-lo");
  });

  it("marks the connection disconnected when Coexy loses the number", async () => {
    const whatsapp = await createCoexyConnection();
    const channel = await connectNumber(whatsapp.id);
    await deliver(textFrom("5511987655555", "Oi"));
    await waitFor(async () => (await Message.count()) === 1);
    const ticket = await Ticket.findOne();
    const full = await ShowTicketService(ticket!.id, 1);

    channel.status = "disconnected";
    await expect(
      SendWhatsAppMessage({ body: "Olá", ticket: full })
    ).rejects.toHaveProperty("message", "ERR_COEXY_CHANNEL_DISCONNECTED");
    await waitFor(
      async () => (await whatsapp.reload()).status === "DISCONNECTED"
    );
    const row = await CloudApiCredential.findByPk(whatsapp.id);
    expect(row?.coexyStatus).toBe("disconnected");
    // The channel is never recreated: the same link reconnects it.
    expect(
      calls.filter(
        call => call.method === "POST" && call.url === "/api/channels"
      )
    ).toHaveLength(1);
  });

  it("deletes the channel with the connection", async () => {
    const whatsapp = await createCoexyConnection();
    await connectNumber(whatsapp.id);
    const { coexyChannelId } = (await CloudApiCredential.findByPk(
      whatsapp.id
    ))!;

    await DeleteWhatsAppService(String(whatsapp.id), 1);

    expect(
      calls.find(
        call =>
          call.method === "DELETE" &&
          call.url === `/api/channels/${coexyChannelId}?force=true`
      )
    ).toBeTruthy();
    expect(channels.size).toBe(0);
    expect(await Whatsapp.count()).toBe(0);
  });
});
