import faker from "faker";

import AppError from "../../../errors/AppError";
import { enqueue } from "../../../libs/queue";
import Campaign from "../../../models/Campaign";
import CampaignContact from "../../../models/CampaignContact";
import Contact from "../../../models/Contact";
import Plan from "../../../models/Plan";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import { sendTemplate as sendTemplate_ } from "../../../providers/WhatsApp/Implementations/cloudapi";
import {
  CAMPAIGN_MARK,
  RunCampaignStep,
  msUntilWindow
} from "../../../services/CampaignServices/CampaignDispatcher";
import {
  CountAudienceService,
  PauseCampaignService,
  ResumeCampaignService,
  SaveCampaignService,
  StartCampaignService
} from "../../../services/CampaignServices/CampaignServices";
import { HandleOptOut } from "../../../services/CampaignServices/OptOutService";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import SaveTagService from "../../../services/TagServices/SaveTagService";
import SetContactTagsService from "../../../services/TagServices/SetContactTagsService";
import FindOrCreateTicketService from "../../../services/TicketServices/FindOrCreateTicketService";
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

// Steps are run by hand; the queue only records what would be scheduled.
jest.mock("../../../libs/queue", () => ({
  defineJob: jest.fn(),
  enqueue: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: { sendMessage: jest.fn().mockResolvedValue({}) }
}));

jest.mock("../../../providers/WhatsApp/Implementations/cloudapi", () => ({
  listTemplates: jest.fn().mockResolvedValue([
    {
      name: "novidades",
      language: "pt_BR",
      category: "MARKETING",
      body: "Olá, {{1}}! Chegou a coleção {{2}}.",
      params: 2
    }
  ]),
  sendTemplate: jest.fn().mockResolvedValue({})
}));

const sendMessage = whatsappProvider.sendMessage as jest.Mock;
const sendTemplate = sendTemplate_ as jest.Mock;
const queued = enqueue as jest.Mock;

const expectAppError = async (promise: Promise<unknown>, message: string) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("message", message);
};

const createContact = (name: string, companyId = 1, extra = {}) =>
  Contact.create({
    name,
    number: faker.phone.phoneNumber("55119########"),
    companyId,
    ...extra
  });

const connected = (companyId = 1) =>
  Whatsapp.create({
    name: faker.random.uuid(),
    status: "CONNECTED",
    companyId
  });

// The window is always open in these tests.
const baseData = (whatsappId: number) => ({
  name: "Black Friday",
  message: "Olá, {{firstName}}! Temos novidades.",
  whatsappId,
  minDelaySeconds: 5,
  maxDelaySeconds: 10,
  windowStart: "00:00",
  windowEnd: "23:59"
});

const lastToken = async (campaignId: number) =>
  (await Campaign.findByPk(campaignId))?.dispatchToken as string;

describe("Phase 5: campaigns", () => {
  beforeEach(async () => {
    await truncate();
    await Plan.update({ campaignsEnabled: true }, { where: { id: 1 } });
    sendMessage.mockClear();
    sendMessage.mockResolvedValue({});
    queued.mockClear();
  });

  afterAll(async () => {
    await truncate();
    await disconnect();
  });

  it("is only available on plans that include campaigns", async () => {
    const whatsapp = await connected();
    await Plan.update({ campaignsEnabled: false }, { where: { id: 1 } });
    await expectAppError(
      SaveCampaignService(1, baseData(whatsapp.id)),
      "ERR_CAMPAIGNS_NOT_IN_PLAN"
    );
  });

  it("validates pauses, window and connection", async () => {
    const whatsapp = await connected();
    await expectAppError(
      SaveCampaignService(1, { ...baseData(whatsapp.id), minDelaySeconds: 1 }),
      "ERR_CAMPAIGN_INVALID_DELAY"
    );
    await expectAppError(
      SaveCampaignService(1, {
        ...baseData(whatsapp.id),
        minDelaySeconds: 30,
        maxDelaySeconds: 10
      }),
      "ERR_CAMPAIGN_INVALID_DELAY"
    );
    await expectAppError(
      SaveCampaignService(1, {
        ...baseData(whatsapp.id),
        windowStart: "20:00",
        windowEnd: "08:00"
      }),
      "ERR_CAMPAIGN_INVALID_WINDOW"
    );

    const other = await CreateCompanyService({
      name: "Outra",
      planId: 1,
      adminName: "Admin",
      adminEmail: faker.internet.email(),
      adminPassword: "123456"
    });
    const foreign = await connected(other.id);
    await expectAppError(
      SaveCampaignService(1, baseData(foreign.id)),
      "ERR_CAMPAIGN_INVALID_CONNECTION"
    );
  });

  it("sends an approved template, with values per contact, on official connections", async () => {
    const ana = await createContact("Ana Souza");
    const whatsapp = await Whatsapp.create({
      name: faker.random.uuid(),
      status: "CONNECTED",
      channel: "cloudapi",
      companyId: 1
    });
    const data = {
      ...baseData(whatsapp.id),
      message: "",
      minDelaySeconds: 1,
      maxDelaySeconds: 2
    };
    await expectAppError(
      SaveCampaignService(1, data),
      "ERR_CLOUD_TEMPLATE_NOT_FOUND"
    );
    await expectAppError(
      SaveCampaignService(1, {
        ...data,
        template: { name: "novidades", language: "pt_BR", params: ["x"] }
      }),
      "ERR_CLOUD_TEMPLATE_PARAMS"
    );

    const campaign = await SaveCampaignService(1, {
      ...data,
      template: {
        name: "novidades",
        language: "pt_BR",
        params: ["{{firstName}}", "Verão"]
      }
    });
    expect(campaign.message).toBe("Olá, {{1}}! Chegou a coleção {{2}}.");
    expect(campaign.includeOptOut).toBe(false);

    await StartCampaignService(1, campaign.id);
    await RunCampaignStep({
      campaignId: campaign.id,
      token: await lastToken(campaign.id)
    });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    const [sessionId, to, template, body] = sendTemplate.mock.calls[0];
    expect(sessionId).toBe(whatsapp.id);
    expect(to).toBe(`${ana.number}@c.us`);
    expect(template).toEqual({
      name: "novidades",
      language: "pt_BR",
      bodyParams: ["Ana", "Verão"]
    });
    expect(body).toBe(`${CAMPAIGN_MARK}Olá, Ana! Chegou a coleção Verão.`);

    // QR Code connections still need 5 seconds between sends.
    await expectAppError(
      SaveCampaignService(1, {
        ...baseData((await connected()).id),
        minDelaySeconds: 1
      }),
      "ERR_CAMPAIGN_INVALID_DELAY"
    );
  });

  it("reaches tagged contacts only, never groups, opted-out or other companies", async () => {
    const vip = await SaveTagService(1, { name: "VIP", color: "#3478F6" });
    const ana = await createContact("Ana Souza");
    const bruno = await createContact("Bruno Lima");
    const out = await createContact("Carla", 1, { optOutAt: new Date() });
    const group = await createContact("Grupo", 1, { isGroup: true });
    await Promise.all(
      [ana, out, group].map(contact =>
        SetContactTagsService(contact.id, [vip.id], 1)
      )
    );
    await createContact("Outro");

    expect(await CountAudienceService(1, [vip.id])).toBe(1);
    expect(await CountAudienceService(1, [])).toBe(3);

    const whatsapp = await connected();
    const campaign = await SaveCampaignService(1, {
      ...baseData(whatsapp.id),
      tagIds: [vip.id]
    });
    await StartCampaignService(1, campaign.id);
    const audience = await CampaignContact.findAll({
      where: { campaignId: campaign.id }
    });
    expect(audience.map(row => row.contactId)).toEqual([ana.id]);
    expect(bruno.id).toBeDefined();
  });

  it("sends one contact per step, with the name and the opt-out line", async () => {
    const ana = await createContact("Ana Souza");
    await createContact("Bruno Lima");
    const whatsapp = await connected();
    const campaign = await SaveCampaignService(1, baseData(whatsapp.id));
    await StartCampaignService(1, campaign.id);
    const token = await lastToken(campaign.id);

    await RunCampaignStep({ campaignId: campaign.id, token });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [sessionId, to, body] = sendMessage.mock.calls[0];
    expect(sessionId).toBe(whatsapp.id);
    expect(to).toBe(`${ana.number}@c.us`);
    expect(body.startsWith(CAMPAIGN_MARK)).toBe(true);
    expect(body).toContain("Olá, Ana! Temos novidades.");
    expect(body).toContain("responda SAIR");

    // The next step waits between 5 and 10 seconds.
    const [, , options] = queued.mock.calls[queued.mock.calls.length - 1];
    expect(options.delay).toBeGreaterThanOrEqual(5000);
    expect(options.delay).toBeLessThanOrEqual(10000);

    sendMessage.mockRejectedValueOnce(new AppError("ERR_WAPP_NOT_INITIALIZED"));
    await RunCampaignStep({ campaignId: campaign.id, token });
    await RunCampaignStep({ campaignId: campaign.id, token });

    await campaign.reload();
    expect(campaign.status).toBe("finished");
    const rows = await CampaignContact.findAll({
      where: { campaignId: campaign.id },
      order: [["id", "ASC"]]
    });
    expect(rows.map(row => row.status)).toEqual(["sent", "failed"]);
    expect(rows[1].error).toBe("ERR_WAPP_NOT_INITIALIZED");
  });

  it("pauses when the connection drops and ignores steps of an old chain", async () => {
    await createContact("Ana Souza");
    const whatsapp = await connected();
    const campaign = await SaveCampaignService(1, baseData(whatsapp.id));
    await StartCampaignService(1, campaign.id);
    const oldToken = await lastToken(campaign.id);

    await whatsapp.update({ status: "DISCONNECTED" });
    await RunCampaignStep({ campaignId: campaign.id, token: oldToken });
    await campaign.reload();
    expect(campaign.status).toBe("paused");
    expect(campaign.lastError).toBe("ERR_CAMPAIGN_CONNECTION_DOWN");

    await whatsapp.update({ status: "CONNECTED" });
    await ResumeCampaignService(1, campaign.id);
    await RunCampaignStep({ campaignId: campaign.id, token: oldToken });
    expect(sendMessage).not.toHaveBeenCalled();

    await RunCampaignStep({
      campaignId: campaign.id,
      token: await lastToken(campaign.id)
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);

    await PauseCampaignService(1, campaign.id);
    await expectAppError(
      PauseCampaignService(1, campaign.id),
      "ERR_CAMPAIGN_NOT_RUNNING"
    );
  });

  it("waits for the sending window", () => {
    // 07:00 in São Paulo (UTC-3) is 10:00 UTC.
    const at7 = new Date("2026-10-20T10:00:00Z");
    expect(msUntilWindow(at7, "America/Sao_Paulo", "08:00", "20:00")).toBe(
      60 * 60 * 1000
    );
    expect(msUntilWindow(at7, "America/Sao_Paulo", "06:00", "20:00")).toBe(0);
    // 21:00 waits until 08:00 the next day.
    const at21 = new Date("2026-10-21T00:00:00Z");
    expect(msUntilWindow(at21, "America/Sao_Paulo", "08:00", "20:00")).toBe(
      11 * 60 * 60 * 1000
    );
  });

  it("unsubscribes contacts who answer SAIR after a campaign", async () => {
    const ana = await createContact("Ana Souza");
    const whatsapp = await connected();
    const message = { id: faker.random.uuid(), body: "Sair!", type: "chat" };

    // No campaign yet: "sair" is an ordinary message.
    await expect(HandleOptOut(ana, whatsapp.id, message)).resolves.toBe(false);

    const campaign = await SaveCampaignService(1, baseData(whatsapp.id));
    await StartCampaignService(1, campaign.id);
    await RunCampaignStep({
      campaignId: campaign.id,
      token: await lastToken(campaign.id)
    });

    await expect(HandleOptOut(ana, whatsapp.id, message)).resolves.toBe(true);
    await ana.reload();
    expect(ana.optOutAt).toBeTruthy();
  });

  it("files the campaign echo in a closed ticket", async () => {
    const ana = await createContact("Ana Souza");
    const whatsapp = await connected();
    const ticket = await FindOrCreateTicketService(
      ana,
      whatsapp.id,
      0,
      undefined,
      {
        keepClosed: true
      }
    );
    expect(ticket.status).toBe("closed");
    expect(ticket.closedAt).toBeFalsy();
  });
});
