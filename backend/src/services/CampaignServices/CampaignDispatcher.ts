import { randomUUID } from "crypto";

import formatBody from "../../helpers/Mustache";
import { getLocalTime } from "../../helpers/BusinessHours";
import { defineJob, enqueue } from "../../libs/queue";
import { emitToCompany } from "../../libs/socket";
import Campaign from "../../models/Campaign";
import CampaignContact from "../../models/CampaignContact";
import Company from "../../models/Company";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import { sendTemplate } from "../../providers/WhatsApp/Implementations/cloudapi";
import { logger } from "../../utils/logger";

// Sends a campaign one contact per step. Each step queues the next one
// after a random pause, so sends look like a person typing and a restart
// picks up where it stopped.

interface DispatchJob {
  campaignId: number;
  token: string;
}

// Messages sent by the system start with \u200e (left out of response
// metrics). Campaign messages add \u2060 so the incoming echo goes to a
// closed ticket instead of filling the waiting list.
export const CAMPAIGN_MARK = "\u200e\u2060";

export const isCampaignMessage = (body: string | undefined): boolean =>
  Boolean(body && body.startsWith(CAMPAIGN_MARK));

const OPT_OUT_LINE =
  "Para não receber mais mensagens como esta, responda SAIR.";

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Milliseconds until the sending window opens, or 0 when it is open.
export const msUntilWindow = (
  now: Date,
  timezone: string,
  windowStart: string,
  windowEnd: string
): number => {
  const { minutes } = getLocalTime(now, timezone);
  const start = toMinutes(windowStart);
  const end = toMinutes(windowEnd);
  if (minutes >= start && minutes < end) return 0;
  const wait = minutes < start ? start - minutes : 24 * 60 - minutes + start;
  return wait * 60 * 1000;
};

const notify = (campaign: Campaign): void => {
  emitToCompany(campaign.companyId, "campaign", {
    action: "update",
    campaignId: campaign.id
  });
};

const queueStep = (campaign: Campaign, token: string, delay: number) =>
  enqueue<DispatchJob>(
    "campaign.dispatch",
    { campaignId: campaign.id, token },
    { delay }
  );

const randomDelay = (campaign: Campaign): number => {
  const min = campaign.minDelaySeconds * 1000;
  const max = campaign.maxDelaySeconds * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
};

// Meta rejects empty template values, so a contact without a name gets a
// neutral word instead.
const sendCampaignTemplate = async (
  campaign: Campaign,
  whatsappId: number,
  target: CampaignContact,
  recipient: Contact
): Promise<void> => {
  const params = campaign.templateParams.map(
    value => formatBody(value, recipient).trim() || "cliente"
  );
  const bodyText = params.reduce(
    (text, value, index) => text.split(`{{${index + 1}}}`).join(value),
    campaign.message
  );
  await sendTemplate(
    whatsappId,
    `${target.number}@c.us`,
    {
      name: campaign.templateName as string,
      language: campaign.templateLanguage as string,
      bodyParams: params
    },
    `${CAMPAIGN_MARK}${bodyText}`
  );
};

// Exported for tests, which run the steps one by one.
export const RunCampaignStep = async ({
  campaignId,
  token
}: DispatchJob): Promise<void> => {
  const campaign = await Campaign.findByPk(campaignId);
  if (
    !campaign ||
    campaign.dispatchToken !== token ||
    !["scheduled", "running"].includes(campaign.status)
  ) {
    return;
  }

  const now = new Date();
  if (campaign.status === "scheduled") {
    if (campaign.scheduledAt && campaign.scheduledAt > now) {
      await queueStep(
        campaign,
        token,
        campaign.scheduledAt.getTime() - now.getTime()
      );
      return;
    }
    await campaign.update({ status: "running", startedAt: now });
    notify(campaign);
  }

  const company = await Company.findByPk(campaign.companyId, {
    attributes: ["timezone"]
  });
  const wait = msUntilWindow(
    now,
    company?.timezone || "America/Sao_Paulo",
    campaign.windowStart,
    campaign.windowEnd
  );
  if (wait > 0) {
    await queueStep(campaign, token, wait);
    return;
  }

  const whatsapp = campaign.whatsappId
    ? await Whatsapp.findByPk(campaign.whatsappId)
    : null;
  if (!whatsapp || whatsapp.status !== "CONNECTED") {
    // Sending to a disconnected number would mark everyone as failed.
    await campaign.update({
      status: "paused",
      lastError: "ERR_CAMPAIGN_CONNECTION_DOWN"
    });
    notify(campaign);
    return;
  }

  const next = await CampaignContact.findOne({
    where: { campaignId: campaign.id, status: "pending" },
    order: [["id", "ASC"]]
  });
  if (!next) {
    await campaign.update({ status: "finished", finishedAt: now });
    notify(campaign);
    return;
  }

  const contact = next.contactId
    ? await Contact.findByPk(next.contactId)
    : null;
  if (contact?.optOutAt) {
    await next.update({ status: "skipped", error: "ERR_CAMPAIGN_OPTED_OUT" });
    await queueStep(campaign, token, 1000);
    return;
  }

  const recipient = contact || ({ name: next.name } as Contact);

  try {
    if (campaign.templateName) {
      await sendCampaignTemplate(campaign, whatsapp.id, next, recipient);
    } else {
      const text = formatBody(campaign.message, recipient);
      const body = `${CAMPAIGN_MARK}${text}${
        campaign.includeOptOut ? `\n\n_${OPT_OUT_LINE}_` : ""
      }`;
      await whatsappProvider.sendMessage(
        whatsapp.id,
        `${next.number}@c.us`,
        body
      );
    }
    await next.update({ status: "sent", sentAt: new Date(), error: null });
  } catch (err) {
    // Providers throw AppError, which is not an Error: read its message.
    const message =
      typeof (err as { message?: unknown })?.message === "string"
        ? (err as { message: string }).message
        : String(err);
    await next.update({ status: "failed", error: message.slice(0, 250) });
  }
  notify(campaign);

  await queueStep(campaign, token, randomDelay(campaign));
};

defineJob<DispatchJob>("campaign.dispatch", async data => {
  try {
    await RunCampaignStep(data);
  } catch (err) {
    // A failed step must not be retried by the queue: it could send twice.
    logger.error({ info: "Campaign step failed", data, err });
  }
});

// Starts (or restarts) the sending chain of a campaign.
export const ScheduleCampaign = async (
  campaign: Campaign,
  delay = 0
): Promise<void> => {
  const token = randomUUID();
  await campaign.update({ dispatchToken: token });
  await queueStep(campaign, token, delay);
  notify(campaign);
};

// After a restart, campaigns that were sending continue. The first step
// waits for the WhatsApp sessions to reconnect; otherwise it would find
// the connection down and pause the campaign.
const RESUME_DELAY = 90 * 1000;

export const ResumeCampaigns = async (): Promise<void> => {
  const campaigns = await Campaign.findAll({
    where: { status: ["scheduled", "running"] }
  });
  await Promise.all(
    campaigns.map(campaign => ScheduleCampaign(campaign, RESUME_DELAY))
  );
};
