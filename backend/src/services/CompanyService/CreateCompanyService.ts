import * as Yup from "yup";
import { v4 as uuidv4 } from "uuid";

import AppError from "../../errors/AppError";
import sequelize from "../../database";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Setting from "../../models/Setting";
import User from "../../models/User";

interface Request {
  name: string;
  planId: number;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

// Creates the company, its first admin and its own API token in one go.
const CreateCompanyService = async ({
  name,
  planId,
  adminName,
  adminEmail,
  adminPassword
}: Request): Promise<Company> => {
  const schema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .required("ERR_COMPANY_INVALID_NAME")
      .min(2, "ERR_COMPANY_INVALID_NAME"),
    planId: Yup.number().required("ERR_PLAN_NOT_FOUND"),
    adminName: Yup.string()
      .trim()
      .required("ERR_COMPANY_ADMIN_REQUIRED")
      .min(2, "ERR_COMPANY_ADMIN_REQUIRED"),
    adminEmail: Yup.string()
      .email("ERR_COMPANY_ADMIN_REQUIRED")
      .required("ERR_COMPANY_ADMIN_REQUIRED"),
    adminPassword: Yup.string()
      .required("ERR_COMPANY_ADMIN_REQUIRED")
      .min(5, "ERR_COMPANY_ADMIN_REQUIRED")
  });

  try {
    await schema.validate({
      name,
      planId,
      adminName,
      adminEmail,
      adminPassword
    });
  } catch (err) {
    throw new AppError(err.message);
  }

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  if (await Company.findOne({ where: { name: name.trim() } })) {
    throw new AppError("ERR_COMPANY_NAME_ALREADY_EXISTS");
  }

  if (await User.findOne({ where: { email: adminEmail } })) {
    throw new AppError("ERR_USER_EMAIL_ALREADY_EXISTS");
  }

  const company = await sequelize.transaction(async transaction => {
    const created = await Company.create(
      { name: name.trim(), planId, status: "active" },
      { transaction }
    );

    await Setting.create(
      { key: "userApiToken", value: uuidv4(), companyId: created.id },
      { transaction }
    );

    await User.create(
      {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        profile: "admin",
        companyId: created.id
      },
      { transaction }
    );

    return created;
  });

  await company.reload({ include: [{ model: Plan, as: "plan" }] });

  return company;
};

export default CreateCompanyService;
