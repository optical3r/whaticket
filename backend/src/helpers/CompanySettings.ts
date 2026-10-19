import Setting from "../models/Setting";

// Settings a company admin can change, with the value used when the company
// never saved one. userApiToken is generated per company and is read-only.
export const SETTING_DEFAULTS = {
  closeReasonRequired: "disabled",
  csatEnabled: "disabled",
  csatMessage:
    "Seu atendimento foi encerrado. Como você avalia o atendimento? Responda com um número de 1 (muito ruim) a 5 (excelente).",
  csatThanksMessage: "Obrigado pela sua avaliação!"
};

export type EditableSettingKey = keyof typeof SETTING_DEFAULTS;

export const EDITABLE_SETTINGS = Object.keys(
  SETTING_DEFAULTS
) as EditableSettingKey[];

export const isEditableSetting = (key: string): key is EditableSettingKey =>
  (EDITABLE_SETTINGS as string[]).includes(key);

export const getCompanySetting = async (
  companyId: number,
  key: EditableSettingKey
): Promise<string> => {
  const setting = await Setting.findOne({ where: { key, companyId } });
  return setting ? setting.value : SETTING_DEFAULTS[key];
};

export const isSettingEnabled = async (
  companyId: number,
  key: EditableSettingKey
): Promise<boolean> => (await getCompanySetting(companyId, key)) === "enabled";
