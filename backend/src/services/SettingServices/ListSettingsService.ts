import Setting from "../../models/Setting";
import { SETTING_DEFAULTS } from "../../helpers/CompanySettings";

interface SettingValue {
  key: string;
  value: string;
}

// Saved settings plus the defaults the company never changed.
const ListSettingsService = async (
  companyId: number
): Promise<SettingValue[]> => {
  const saved = await Setting.findAll({ where: { companyId } });

  const defaults = Object.entries(SETTING_DEFAULTS)
    .filter(([key]) => !saved.some(setting => setting.key === key))
    .map(([key, value]) => ({ key, value }));

  return [...saved.map(({ key, value }) => ({ key, value })), ...defaults];
};

export default ListSettingsService;
