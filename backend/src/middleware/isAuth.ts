import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";
import { assertCompanyIsActive } from "../helpers/CompanyStatus";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  super: boolean;
  iat: number;
  exp: number;
}

const isAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  let decoded: TokenPayload;
  try {
    decoded = verify(token, authConfig.secret) as TokenPayload;
  } catch (err) {
    throw new AppError(
      "Invalid token. We'll try to assign a new one on next request",
      403
    );
  }

  // Tokens issued before multi-tenancy have no company. A 403 makes the
  // frontend fetch a new token through the refresh endpoint.
  if (!decoded.companyId) {
    throw new AppError("ERR_INVALID_TOKEN", 403);
  }

  await assertCompanyIsActive(decoded.companyId);

  req.user = {
    id: decoded.id,
    profile: decoded.profile,
    companyId: decoded.companyId,
    super: !!decoded.super
  };

  return next();
};

export default isAuth;
