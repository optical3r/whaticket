import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import Plan from "../../models/Plan";

interface PlanData {
  name: string;
  users: number;
  connections: number;
  queues: number;
  aiMonthlyRequests?: number;
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
  aiMonthlyRequests: Yup.number()
    .integer("ERR_PLAN_INVALID_LIMIT")
    .min(0, "ERR_PLAN_INVALID_LIMIT")
    .max(10000000, "ERR_PLAN_INVALID_LIMIT")
});

// Creates a plan, or updates it when planId is given.
const SavePlanService = async (
  planData: PlanData,
  planId?: number | string
): Promise<Plan> => {
  const { name, users, connections, queues, aiMonthlyRequests } = planData;

  try {
    await schema.validate({
      name,
      users,
      connections,
      queues,
      aiMonthlyRequests
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
    // Kept as is when an older client does not send it.
    ...(aiMonthlyRequests !== undefined && aiMonthlyRequests !== null
      ? { aiMonthlyRequests: Number(aiMonthlyRequests) }
      : {})
  };

  if (!planId) {
    return Plan.create(values);
  }

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  await plan.update(values);
  return plan;
};

export default SavePlanService;
