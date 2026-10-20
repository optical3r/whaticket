import * as Yup from "yup";
import { Op, WhereOptions, fn, col } from "sequelize";

import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import CampaignContact from "../../models/CampaignContact";
import Company from "../../models/Company";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import Plan from "../../models/Plan";
import Tag from "../../models/Tag";
import Whatsapp from "../../models/Whatsapp";
import { listTemplates } from "../../providers/WhatsApp/Implementations/cloudapi";
import { ScheduleCampaign } from "./CampaignDispatcher";

export const MAX_AUDIENCE = 5000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface CampaignData {
  name: string;
  message: string;
  whatsappId: number;
  tagIds?: number[];
  scheduledAt?: string | null;
  minDelaySeconds?: number;
  maxDelaySeconds?: number;
  windowStart?: string;
  windowEnd?: string;
  includeOptOut?: boolean;
  // Official connections: an approved template and one value per {{n}}.
  template?: { name?: unknown; language?: unknown; params?: unknown } | null;
}

const schema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("ERR_CAMPAIGN_INVALID_NAME")
    .max(80, "ERR_CAMPAIGN_INVALID_NAME"),
  message: Yup.string().trim().max(4000, "ERR_CAMPAIGN_MESSAGE_TOO_LONG"),
  whatsappId: Yup.number().required("ERR_CAMPAIGN_INVALID_CONNECTION"),
  // QR Code connections need 5 seconds at least (checked below).
  minDelaySeconds: Yup.number()
    .integer("ERR_CAMPAIGN_INVALID_DELAY")
    .min(1, "ERR_CAMPAIGN_INVALID_DELAY")
    .max(600, "ERR_CAMPAIGN_INVALID_DELAY"),
  maxDelaySeconds: Yup.number()
    .integer("ERR_CAMPAIGN_INVALID_DELAY")
    .min(1, "ERR_CAMPAIGN_INVALID_DELAY")
    .max(600, "ERR_CAMPAIGN_INVALID_DELAY"),
  windowStart: Yup.string().matches(TIME, "ERR_CAMPAIGN_INVALID_WINDOW"),
  windowEnd: Yup.string().matches(TIME, "ERR_CAMPAIGN_INVALID_WINDOW"),
  includeOptOut: Yup.boolean()
});

export const assertCampaignsInPlan = async (
  companyId: number
): Promise<void> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan", attributes: ["campaignsEnabled"] }]
  });
  if (!company?.plan?.campaignsEnabled) {
    throw new AppError("ERR_CAMPAIGNS_NOT_IN_PLAN", 403);
  }
};

const findCampaign = async (
  companyId: number,
  campaignId: number | string
): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id: campaignId, companyId }
  });
  if (!campaign) {
    throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  }
  return campaign;
};

// Contacts the campaign would reach today: not groups, with a number,
// not opted out and, when tags are chosen, with any of them.
const audienceQuery = async (
  companyId: number,
  tagIds: number[]
): Promise<WhereOptions> => {
  const where: Record<string | symbol, unknown> = {
    companyId,
    isGroup: false,
    optOutAt: null,
    number: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] }
  };
  if (tagIds.length > 0) {
    const links = await ContactTag.findAll({
      where: { tagId: tagIds },
      attributes: ["contactId"]
    });
    where.id = links.map(link => link.contactId);
  }
  return where as WhereOptions;
};

const validTagIds = async (
  companyId: number,
  tagIds: unknown
): Promise<number[]> => {
  const ids = Array.isArray(tagIds)
    ? Array.from(new Set(tagIds.map(Number).filter(Number.isInteger)))
    : [];
  if (ids.length === 0) return [];
  const found = await Tag.count({ where: { id: ids, companyId } });
  if (found !== ids.length) {
    throw new AppError("ERR_TAG_NOT_FOUND", 404);
  }
  return ids;
};

export const CountAudienceService = async (
  companyId: number,
  tagIds: unknown
): Promise<number> =>
  Contact.count({
    where: await audienceQuery(companyId, await validTagIds(companyId, tagIds))
  });

// Free text, with pauses long enough to keep the number from being blocked.
const qrcodeContent = (data: CampaignData, minDelay: number) => {
  const message = (data.message || "").trim();
  if (!message) throw new AppError("ERR_CAMPAIGN_EMPTY_MESSAGE");
  if (minDelay < 5) throw new AppError("ERR_CAMPAIGN_INVALID_DELAY");
  return {
    message,
    includeOptOut: data.includeOptOut !== false,
    templateName: null,
    templateLanguage: null,
    templateParams: []
  };
};

// Meta only accepts approved templates for messages the customer did not
// ask for. Values may use {{name}} and {{firstName}}, filled per contact.
const templateContent = async (
  whatsappId: number,
  input: CampaignData["template"]
) => {
  const templates = await listTemplates(whatsappId);
  const template = templates.find(
    item => item.name === input?.name && item.language === input?.language
  );
  if (!template) throw new AppError("ERR_CLOUD_TEMPLATE_NOT_FOUND", 404);

  const params = Array.isArray(input?.params)
    ? input?.params.map(value => String(value).trim())
    : [];
  if (
    params.length !== template.params ||
    params.some(value => !value || value.length > 1000)
  ) {
    throw new AppError("ERR_CLOUD_TEMPLATE_PARAMS");
  }
  return {
    message: template.body,
    // The opt-out line cannot be added to a template; SAIR still works.
    includeOptOut: false,
    templateName: template.name,
    templateLanguage: template.language,
    templateParams: params
  };
};

const validate = async (
  companyId: number,
  data: CampaignData
): Promise<Partial<Campaign>> => {
  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }

  const minDelay = Number(data.minDelaySeconds ?? 20);
  const maxDelay = Number(data.maxDelaySeconds ?? 60);
  if (minDelay > maxDelay) {
    throw new AppError("ERR_CAMPAIGN_INVALID_DELAY");
  }
  const windowStart = data.windowStart || "08:00";
  const windowEnd = data.windowEnd || "20:00";
  if (windowStart >= windowEnd) {
    throw new AppError("ERR_CAMPAIGN_INVALID_WINDOW");
  }

  const whatsapp = await Whatsapp.findOne({
    where: { id: data.whatsappId, companyId }
  });
  if (!whatsapp) {
    throw new AppError("ERR_CAMPAIGN_INVALID_CONNECTION");
  }
  const content =
    whatsapp.channel === "cloudapi"
      ? await templateContent(whatsapp.id, data.template)
      : qrcodeContent(data, minDelay);

  let scheduledAt: Date | null = null;
  if (data.scheduledAt) {
    scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new AppError("ERR_CAMPAIGN_INVALID_SCHEDULE");
    }
  }

  return {
    name: data.name.trim(),
    ...content,
    whatsappId: whatsapp.id,
    tagIds: await validTagIds(companyId, data.tagIds),
    scheduledAt,
    minDelaySeconds: minDelay,
    maxDelaySeconds: maxDelay,
    windowStart,
    windowEnd
  };
};

// Creates a draft, or changes one that has not started.
export const SaveCampaignService = async (
  companyId: number,
  data: CampaignData,
  campaignId?: number | string
): Promise<Campaign> => {
  await assertCampaignsInPlan(companyId);
  const values = await validate(companyId, data);

  if (!campaignId) {
    return Campaign.create({ ...values, status: "draft", companyId });
  }

  const campaign = await findCampaign(companyId, campaignId);
  if (!["draft", "scheduled"].includes(campaign.status)) {
    throw new AppError("ERR_CAMPAIGN_ALREADY_STARTED");
  }
  await campaign.update({ ...values, status: "draft" });
  return campaign;
};

export const DeleteCampaignService = async (
  companyId: number,
  campaignId: number | string
): Promise<void> => {
  const campaign = await findCampaign(companyId, campaignId);
  if (campaign.status === "running") {
    throw new AppError("ERR_CAMPAIGN_RUNNING");
  }
  await campaign.destroy();
};

// Fixes the audience and starts sending, now or at scheduledAt.
export const StartCampaignService = async (
  companyId: number,
  campaignId: number | string
): Promise<Campaign> => {
  await assertCampaignsInPlan(companyId);
  const campaign = await findCampaign(companyId, campaignId);
  if (campaign.status !== "draft") {
    throw new AppError("ERR_CAMPAIGN_ALREADY_STARTED");
  }
  if (!campaign.whatsappId) {
    throw new AppError("ERR_CAMPAIGN_INVALID_CONNECTION");
  }

  const contacts = await Contact.findAll({
    where: await audienceQuery(companyId, campaign.tagIds),
    attributes: ["id", "name", "number"],
    limit: MAX_AUDIENCE + 1
  });
  if (contacts.length === 0) {
    throw new AppError("ERR_CAMPAIGN_EMPTY_AUDIENCE");
  }
  if (contacts.length > MAX_AUDIENCE) {
    throw new AppError("ERR_CAMPAIGN_AUDIENCE_TOO_LARGE");
  }

  await CampaignContact.destroy({ where: { campaignId: campaign.id } });
  await CampaignContact.bulkCreate(
    contacts.map(contact => ({
      campaignId: campaign.id,
      contactId: contact.id,
      name: contact.name,
      number: contact.number,
      status: "pending"
    }))
  );

  await campaign.update({ status: "scheduled", lastError: null });
  await ScheduleCampaign(campaign);
  return campaign;
};

export const PauseCampaignService = async (
  companyId: number,
  campaignId: number | string
): Promise<Campaign> => {
  const campaign = await findCampaign(companyId, campaignId);
  if (!["scheduled", "running"].includes(campaign.status)) {
    throw new AppError("ERR_CAMPAIGN_NOT_RUNNING");
  }
  await campaign.update({ status: "paused" });
  return campaign;
};

export const ResumeCampaignService = async (
  companyId: number,
  campaignId: number | string
): Promise<Campaign> => {
  await assertCampaignsInPlan(companyId);
  const campaign = await findCampaign(companyId, campaignId);
  if (campaign.status !== "paused") {
    throw new AppError("ERR_CAMPAIGN_NOT_PAUSED");
  }
  await campaign.update({
    status: campaign.startedAt ? "running" : "scheduled",
    lastError: null
  });
  await ScheduleCampaign(campaign);
  return campaign;
};

export const CancelCampaignService = async (
  companyId: number,
  campaignId: number | string
): Promise<Campaign> => {
  const campaign = await findCampaign(companyId, campaignId);
  if (["finished", "cancelled"].includes(campaign.status)) {
    throw new AppError("ERR_CAMPAIGN_ALREADY_FINISHED");
  }
  await campaign.update({ status: "cancelled", finishedAt: new Date() });
  return campaign;
};

export interface CampaignCounts {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
}

export const campaignCounts = async (
  campaignIds: number[]
): Promise<Record<number, CampaignCounts>> => {
  const rows = (await CampaignContact.findAll({
    where: { campaignId: campaignIds },
    attributes: ["campaignId", "status", [fn("COUNT", col("id")), "count"]],
    group: ["campaignId", "status"],
    raw: true
  })) as unknown as { campaignId: number; status: string; count: string }[];

  const counts: Record<number, CampaignCounts> = {};
  campaignIds.forEach(id => {
    counts[id] = { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0 };
  });
  rows.forEach(row => {
    const entry = counts[row.campaignId];
    const value = Number(row.count);
    entry.total += value;
    if (row.status in entry) {
      entry[row.status as keyof CampaignCounts] += value;
    }
  });
  return counts;
};

export const ListCampaignsService = async (
  companyId: number
): Promise<(Record<string, unknown> & { counts: CampaignCounts })[]> => {
  const campaigns = await Campaign.findAll({
    where: { companyId },
    include: [{ model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]]
  });
  const counts = await campaignCounts(campaigns.map(campaign => campaign.id));
  return campaigns.map(campaign => ({
    ...campaign.toJSON(),
    tagIds: campaign.tagIds,
    counts: counts[campaign.id]
  }));
};

export const CampaignReportService = async (
  companyId: number,
  campaignId: number | string,
  status?: string
): Promise<CampaignContact[]> => {
  const campaign = await findCampaign(companyId, campaignId);
  return CampaignContact.findAll({
    where: {
      campaignId: campaign.id,
      ...(status ? { status } : {})
    },
    attributes: ["id", "name", "number", "status", "error", "sentAt"],
    order: [["id", "ASC"]],
    limit: MAX_AUDIENCE
  });
};
