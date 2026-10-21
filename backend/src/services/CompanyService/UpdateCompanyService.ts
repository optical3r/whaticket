import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import Company, { CompanyStatus } from "../../models/Company";
import Plan from "../../models/Plan";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import { invalidateCompanyStatus } from "../../helpers/CompanyStatus";
import { whatsappProvider } from "../../providers/WhatsApp";
import { StartWhatsAppSession } from "../WbotServices/StartWhatsAppSession";
import { SyncQrcodeSessions } from "../WbotServices/QrcodeSessions";
import { logger } from "../../utils/logger";

interface CompanyData {
  name?: string;
  planId?: number;
  status?: CompanyStatus;
}

interface Request {
  companyId: number | string;
  companyData: CompanyData;
  // The super admin's own company can never be suspended by mistake.
  requesterCompanyId: number;
}

const stopCompanySessions = async (companyId: number): Promise<void> => {
  const whatsapps = await Whatsapp.findAll({ where: { companyId } });

  await Promise.all(
    whatsapps.map(async whatsapp => {
      try {
        // Keeps the stored WhatsApp login, so reactivating needs no new QR code.
        await whatsappProvider.removeSession(whatsapp.id);
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
      } catch (err) {
        logger.error({
          info: "Error stopping session",
          err,
          whatsappId: whatsapp.id
        });
      }
    })
  );
};

const startCompanySessions = async (companyId: number): Promise<void> => {
  const whatsapps = await Whatsapp.findAll({ where: { companyId } });
  whatsapps.forEach(whatsapp => {
    StartWhatsAppSession(whatsapp);
  });
};

const UpdateCompanyService = async ({
  companyId,
  companyData,
  requesterCompanyId
}: Request): Promise<Company> => {
  const { name, planId, status } = companyData;

  const schema = Yup.object().shape({
    name: Yup.string().trim().min(2, "ERR_COMPANY_INVALID_NAME"),
    status: Yup.string().oneOf(
      ["active", "suspended"],
      "ERR_COMPANY_INVALID_STATUS"
    )
  });

  try {
    await schema.validate({ name, status });
  } catch (err) {
    throw new AppError(err.message);
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  if (planId !== undefined && !(await Plan.findByPk(planId))) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  if (
    name &&
    (await Company.findOne({
      where: { name: name.trim(), id: { [Op.not]: company.id } }
    }))
  ) {
    throw new AppError("ERR_COMPANY_NAME_ALREADY_EXISTS");
  }

  if (status === "suspended" && company.id === requesterCompanyId) {
    throw new AppError("ERR_CANNOT_SUSPEND_OWN_COMPANY", 403);
  }

  const previousStatus = company.status;
  const previousPlan = await Plan.findByPk(company.planId, {
    attributes: ["qrcodeEnabled"]
  });

  await company.update({
    name: name ? name.trim() : company.name,
    planId: planId ?? company.planId,
    status: status ?? company.status
  });

  if (status && status !== previousStatus) {
    invalidateCompanyStatus(company.id);

    if (status === "suspended") {
      // Ends every open session at its next token refresh.
      await User.increment("tokenVersion", {
        where: { companyId: company.id }
      });
      await stopCompanySessions(company.id);
    } else {
      await startCompanySessions(company.id);
    }
  }

  await company.reload({ include: [{ model: Plan, as: "plan" }] });

  // A new plan may add or take away QR code connections.
  const qrcodeNow = company.plan?.qrcodeEnabled !== false;
  if (
    company.status === "active" &&
    (status === undefined || status === previousStatus) &&
    qrcodeNow !== (previousPlan?.qrcodeEnabled !== false)
  ) {
    await SyncQrcodeSessions([company.id], qrcodeNow);
  }

  return company;
};

export default UpdateCompanyService;
