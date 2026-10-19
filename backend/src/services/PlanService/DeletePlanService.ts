import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

const DeletePlanService = async (planId: number | string): Promise<void> => {
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  if ((await Company.count({ where: { planId: plan.id } })) > 0) {
    throw new AppError("ERR_PLAN_IN_USE");
  }

  await plan.destroy();
};

export default DeletePlanService;
