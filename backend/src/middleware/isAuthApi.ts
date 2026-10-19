import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import Setting from "../models/Setting";
import { assertCompanyIsActive } from "../helpers/CompanyStatus";

// Each company has its own API token; the token identifies the company.
const isAuthApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const setting = await Setting.findOne({
    where: { key: "userApiToken", value: token }
  });

  if (!setting) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  await assertCompanyIsActive(setting.companyId);

  req.user = {
    id: "",
    profile: "api",
    companyId: setting.companyId,
    super: false
  };

  return next();
};

export default isAuthApi;
