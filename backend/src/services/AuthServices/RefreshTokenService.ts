import { verify } from "jsonwebtoken";
import { Response as Res } from "express";

import User from "../../models/User";
import AppError from "../../errors/AppError";
import authConfig from "../../config/auth";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import { assertCompanyIsActive } from "../../helpers/CompanyStatus";

interface RefreshTokenPayload {
  id: string;
  tokenVersion: number;
}

interface Response {
  user: ReturnType<typeof SerializeUser>;
  newToken: string;
  refreshToken: string;
}

export const RefreshTokenService = async (
  res: Res,
  token: string
): Promise<Response> => {
  try {
    const decoded = verify(token, authConfig.refreshSecret);
    const { id, tokenVersion } = decoded as RefreshTokenPayload;

    const user = await User.findByPk(id, {
      include: ["queues", "whatsapp", "company"]
    });

    if (!user || user.tokenVersion !== tokenVersion) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    await assertCompanyIsActive(user.companyId);

    const newToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    return { user: SerializeUser(user), newToken, refreshToken };
  } catch (err) {
    res.clearCookie("jrt");
    if (err instanceof AppError && err.message === "ERR_COMPANY_SUSPENDED") {
      throw err;
    }
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }
};
