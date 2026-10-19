import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import CompanyUsageService, { CompanyUsage } from "./CompanyUsage";

interface Response {
  company: Company;
  usage: CompanyUsage;
}

const ShowCompanyService = async (companyId: number): Promise<Response> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  const usage = await CompanyUsageService(companyId);

  return { company, usage };
};

export default ShowCompanyService;
