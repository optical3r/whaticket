import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import User from "../../models/User";

const AcceptTermsService = async (
  companyId: number,
  userId: number | string
): Promise<Company> => {
  const company = await Company.findByPk(companyId);
  const user = await User.findOne({ where: { id: userId, companyId } });

  if (!company || !user) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  if (!company.termsAcceptedAt) {
    // Keeps who accepted, even if that user is removed later.
    await company.update({
      termsAcceptedAt: new Date(),
      termsAcceptedBy: `${user.name} <${user.email}>`
    });
  }

  return company;
};

export default AcceptTermsService;
