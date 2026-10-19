import { Request, Response } from "express";

import DeletePlanService from "../services/PlanService/DeletePlanService";
import ListPlansService from "../services/PlanService/ListPlansService";
import SavePlanService from "../services/PlanService/SavePlanService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const plans = await ListPlansService();

  return res.status(200).json(plans);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, users, connections, queues, aiEnabled, aiMonthlyRequests } =
    req.body;

  const plan = await SavePlanService({
    name,
    users,
    connections,
    queues,
    aiEnabled,
    aiMonthlyRequests
  });

  return res.status(200).json(plan);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { planId } = req.params;
  const { name, users, connections, queues, aiEnabled, aiMonthlyRequests } =
    req.body;

  const plan = await SavePlanService(
    { name, users, connections, queues, aiEnabled, aiMonthlyRequests },
    planId
  );

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
