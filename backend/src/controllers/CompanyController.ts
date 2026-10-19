import { Request, Response } from "express";

import AppError from "../errors/AppError";
import { emitToCompany } from "../libs/socket";
import AcceptTermsService from "../services/CompanyService/AcceptTermsService";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import ListCompaniesService from "../services/CompanyService/ListCompaniesService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import UpdateCompanyService from "../services/CompanyService/UpdateCompanyService";

// Company of the logged-in user: plan, usage and terms status.
export const current = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { company, usage } = await ShowCompanyService(req.user.companyId);

  return res.status(200).json({ ...company.toJSON(), usage });
};

export const acceptTerms = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { companyId, id: userId } = req.user;
  const company = await AcceptTermsService(companyId, userId);

  emitToCompany(companyId, "company", { action: "update", company });

  return res.status(200).json(company);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companies = await ListCompaniesService();

  return res
    .status(200)
    .json(
      companies.map(({ company, usage }) => ({ ...company.toJSON(), usage }))
    );
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, planId, adminName, adminEmail, adminPassword } = req.body;

  const company = await CreateCompanyService({
    name,
    planId,
    adminName,
    adminEmail,
    adminPassword
  });

  return res.status(200).json(company);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.params;
  const { name, planId, status } = req.body;

  const company = await UpdateCompanyService({
    companyId,
    companyData: { name, planId, status },
    requesterCompanyId: req.user.companyId
  });

  return res.status(200).json(company);
};
