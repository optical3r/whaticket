import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";
import { isEditableSetting } from "../../helpers/CompanySettings";

interface Request {
  key: string;
  value: string;
  companyId: number;
}

const MAX_VALUE_LENGTH = 1000;

const UpdateSettingService = async ({
  key,
  value,
  companyId
}: Request): Promise<Setting> => {
  if (!isEditableSetting(key)) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
    throw new AppError("ERR_INVALID_SETTING_VALUE");
  }

  const isToggle = key === "closeReasonRequired" || key === "csatEnabled";
  if (isToggle && !["enabled", "disabled"].includes(value)) {
    throw new AppError("ERR_INVALID_SETTING_VALUE");
  }

  const [setting] = await Setting.findOrCreate({
    where: { key, companyId },
    defaults: { key, value, companyId }
  });

  await setting.update({ value });

  return setting;
};

export default UpdateSettingService;
