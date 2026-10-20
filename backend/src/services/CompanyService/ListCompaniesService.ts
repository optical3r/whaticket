import Company from "../../models/Company";
import Plan from "../../models/Plan";
import CompanyUsageService, { CompanyUsage } from "./CompanyUsage";

interface CompanyWithUsage {
  company: Company;
  usage: CompanyUsage;
}

const ListCompaniesService = async (): Promise<CompanyWithUsage[]> => {
  const companies = await Company.findAll({
    include: [{ model: Plan, as: "plan" }],
    order: [["name", "ASC"]]
  });

  return Promise.all(
    companies.map(async company => ({
      company,
      usage: await CompanyUsageService(company.id)
    }))
  );
};

export default ListCompaniesService;
