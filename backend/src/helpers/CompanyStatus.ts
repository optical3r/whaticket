import AppError from "../errors/AppError";
import Company, { CompanyStatus } from "../models/Company";

const CACHE_TTL_MS = 30 * 1000;

const cache = new Map<number, { status: CompanyStatus; expiresAt: number }>();

// Checked on every authenticated request, so the status is cached briefly.
export const getCompanyStatus = async (
  companyId: number
): Promise<CompanyStatus | null> => {
  const cached = cache.get(companyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status;
  }

  const company = await Company.findByPk(companyId, {
    attributes: ["id", "status"]
  });
  if (!company) {
    cache.delete(companyId);
    return null;
  }

  cache.set(companyId, {
    status: company.status,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
  return company.status;
};

export const invalidateCompanyStatus = (companyId: number): void => {
  cache.delete(companyId);
};

export const assertCompanyIsActive = async (
  companyId: number
): Promise<void> => {
  const status = await getCompanyStatus(companyId);

  if (status === null) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  // 401 makes the frontend end the session instead of retrying.
  if (status !== "active") {
    throw new AppError("ERR_COMPANY_SUSPENDED", 401);
  }
};
