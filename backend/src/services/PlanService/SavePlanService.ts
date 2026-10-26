import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import { SyncQrcodeSessions } from "../WbotServices/QrcodeSessions";

interface PlanData {
  name: string;
  users: number;
  connections: number;
  queues: number;
  aiEnabled?: boolean;
  campaignsEnabled?: boolean;
  aiKeySource?: string;
  aiMonthlyRequests?: number;
  transcriptionEnabled?: boolean;
  transcriptionMonthlyMinutes?: number;
  qrcodeEnabled?: boolean;
  coexyEnabled?: boolean;
  coexyMaxChannels?: number;
}

const schema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("ERR_PLAN_INVALID_NAME")
    .min(2, "ERR_PLAN_INVALID_NAME"),
  users: Yup.number()
    .integer()
    .min(1, "ERR_PLAN_INVALID_LIMIT")
    .required("ERR_PLAN_INVALID_LIMIT"),
  connections: Yup.number()
    .integer()
    .min(1, "ERR_PLAN_INVALID_LIMIT")
    .required("ERR_PLAN_INVALID_LIMIT"),
  queues: Yup.number()
    .integer()
    .min(0, "ERR_PLAN_INVALID_LIMIT")
    .required("ERR_PLAN_INVALID_LIMIT"),
  aiEnabled: Yup.boolean(),
  campaignsEnabled: Yup.boolean(),
  aiKeySource: Yup.mixed().oneOf(
    ["platform", "company", undefined],
    "ERR_PLAN_INVALID_AI_KEY_SOURCE"
  ),
  aiMonthlyRequests: Yup.number()
    .integer("ERR_PLAN_INVALID_LIMIT")
    .min(0, "ERR_PLAN_INVALID_LIMIT")
    .max(10000000, "ERR_PLAN_INVALID_LIMIT"),
  transcriptionEnabled: Yup.boolean(),
  qrcodeEnabled: Yup.boolean(),
  coexyEnabled: Yup.boolean(),
  coexyMaxChannels: Yup.number()
    .integer("ERR_PLAN_INVALID_LIMIT")
    .min(0, "ERR_PLAN_INVALID_LIMIT")
    .max(1000, "ERR_PLAN_INVALID_LIMIT"),
  transcriptionMonthlyMinutes: Yup.number()
    .integer("ERR_PLAN_INVALID_LIMIT")
    .min(0, "ERR_PLAN_INVALID_LIMIT")
    .max(1000000, "ERR_PLAN_INVALID_LIMIT")
});

// Creates a plan, or updates it when planId is given.
const SavePlanService = async (
  planData: PlanData,
  planId?: number | string
): Promise<Plan> => {
  const {
    name,
    users,
    connections,
    queues,
    aiEnabled,
    campaignsEnabled,
    aiKeySource,
    aiMonthlyRequests,
    transcriptionEnabled,
    transcriptionMonthlyMinutes,
    qrcodeEnabled,
    coexyEnabled,
    coexyMaxChannels
  } = planData;

  try {
    await schema.validate({
      name,
      users,
      connections,
      queues,
      aiEnabled,
      campaignsEnabled,
      aiKeySource,
      aiMonthlyRequests,
      transcriptionEnabled,
      transcriptionMonthlyMinutes,
      qrcodeEnabled,
      coexyEnabled,
      coexyMaxChannels
    });
  } catch (err) {
    throw new AppError(err.message);
  }

  const sameName = await Plan.findOne({
    where: {
      name: name.trim(),
      ...(planId ? { id: { [Op.not]: planId } } : {})
    }
  });
  if (sameName) {
    throw new AppError("ERR_PLAN_NAME_ALREADY_EXISTS");
  }

  const values = {
    name: name.trim(),
    users: Number(users),
    connections: Number(connections),
    queues: Number(queues),
    // AI fields are kept as they are when a client does not send them.
    ...(typeof aiEnabled === "boolean" ? { aiEnabled } : {}),
    ...(typeof campaignsEnabled === "boolean" ? { campaignsEnabled } : {}),
    ...(aiKeySource ? { aiKeySource } : {}),
    ...(aiMonthlyRequests !== undefined && aiMonthlyRequests !== null
      ? { aiMonthlyRequests: Number(aiMonthlyRequests) }
      : {}),
    ...(typeof qrcodeEnabled === "boolean" ? { qrcodeEnabled } : {}),
    ...(typeof coexyEnabled === "boolean" ? { coexyEnabled } : {}),
    ...(coexyMaxChannels !== undefined && coexyMaxChannels !== null
      ? { coexyMaxChannels: Number(coexyMaxChannels) }
      : {}),
    ...(typeof transcriptionEnabled === "boolean"
      ? { transcriptionEnabled }
      : {}),
    ...(transcriptionMonthlyMinutes !== undefined &&
    transcriptionMonthlyMinutes !== null
      ? { transcriptionMonthlyMinutes: Number(transcriptionMonthlyMinutes) }
      : {})
  };

  if (!planId) {
    return Plan.create(values);
  }

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  const hadQrcode = plan.qrcodeEnabled;
  await plan.update(values);

  // Companies on the plan lose (or get back) their QR code connections.
  if (plan.qrcodeEnabled !== hadQrcode) {
    const companies = await Company.findAll({
      where: { planId: plan.id },
      attributes: ["id"]
    });
    await SyncQrcodeSessions(
      companies.map(company => company.id),
      plan.qrcodeEnabled
    );
  }
  return plan;
};

export default SavePlanService;
