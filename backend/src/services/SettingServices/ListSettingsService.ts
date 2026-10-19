import Setting from "../../models/Setting";
import { SETTING_DEFAULTS } from "../../helpers/CompanySettings";
import { isAiSettingKey } from "../../helpers/AiSettings";

interface SettingValue {
  key: string;
  value: string;
}

// Saved settings plus the defaults the company never changed.
const ListSettingsService = async (
  companyId: number
): Promise<SettingValue[]> => {
  // AI settings have their own screen and routes.
  const saved = (await Setting.findAll({ where: { companyId } })).filter(
    setting => !isAiSettingKey(setting.key)
  );

  const defaults = Object.entries(SETTING_DEFAULTS)
    .filter(([key]) => !saved.some(setting => setting.key === key))
    .map(([key, value]) => ({ key, value }));

  return [...saved.map(({ key, value }) => ({ key, value })), ...defaults];
};

export default ListSettingsService;
