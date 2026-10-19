import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

export type LimitedResource = "users" | "connections" | "queues";

const countResource = (
  resource: LimitedResource,
  companyId: number
): PromiseLike<number> => {
  switch (resource) {
    case "users":
      return User.count({ where: { companyId } });
    case "connections":
      return Whatsapp.count({ where: { companyId } });
    default:
      return Queue.count({ where: { companyId } });
  }
};

// Throws when the company already uses everything its plan allows.
const CheckCompanyLimit = async (
  companyId: number,
  resource: LimitedResource
): Promise<void> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  const used = await countResource(resource, companyId);

  if (used >= company.plan[resource]) {
    throw new AppError(`ERR_PLAN_LIMIT_${resource.toUpperCase()}`, 403);
  }
};

export default CheckCompanyLimit;
