import { Request, Response } from "express";

import DeletePlanService from "../services/PlanService/DeletePlanService";
import ListPlansService from "../services/PlanService/ListPlansService";
import SavePlanService from "../services/PlanService/SavePlanService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const plans = await ListPlansService();

  return res.status(200).json(plans);
};

// Only the fields a plan has; anything else in the body is ignored.
const planFields = (body: Record<string, unknown>) => {
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
  } = body;
  return {
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
  } as Parameters<typeof SavePlanService>[0];
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const plan = await SavePlanService(planFields(req.body));

  return res.status(200).json(plan);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const plan = await SavePlanService(planFields(req.body), req.params.planId);

  return res.status(200).json(plan);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { planId } = req.params;

  await DeletePlanService(planId);

  return res.status(200).json({ message: "Plan deleted" });
};
