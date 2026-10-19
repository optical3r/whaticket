import * as Yup from "yup";

import AppError from "../errors/AppError";
import Setting from "../models/Setting";

// Virtual assistant settings of a company. Stored in Settings with an "ai."
// prefix and edited only through the AI routes, which validate them.
export interface AiSettings {
  assistantEnabled: boolean;
  assistantName: string;
  instructions: string;
  handoffMessage: string;
  maxReplies: number;
}

export const AI_SETTING_DEFAULTS: AiSettings = {
  assistantEnabled: false,
  assistantName: "Assistente virtual",
  instructions: "",
  handoffMessage:
    "Vou transferir você para uma pessoa da nossa equipe. Em breve alguém continua o atendimento por aqui.",
  maxReplies: 10
};

const KEY_PREFIX = "ai.";

export const isAiSettingKey = (key: string): boolean =>
  key.startsWith(KEY_PREFIX);

const schema = Yup.object().shape({
  assistantEnabled: Yup.boolean(),
  assistantName: Yup.string()
    .trim()
    .min(2, "ERR_AI_INVALID_SETTINGS")
    .max(60, "ERR_AI_INVALID_SETTINGS"),
  instructions: Yup.string().max(4000, "ERR_AI_INSTRUCTIONS_TOO_LONG"),
  handoffMessage: Yup.string()
    .trim()
    .min(2, "ERR_AI_INVALID_SETTINGS")
    .max(1000, "ERR_AI_INVALID_SETTINGS"),
  maxReplies: Yup.number()
    .integer("ERR_AI_INVALID_SETTINGS")
    .min(1, "ERR_AI_INVALID_SETTINGS")
    .max(50, "ERR_AI_INVALID_SETTINGS")
});

const parse = (key: keyof AiSettings, raw: string): AiSettings[typeof key] => {
  switch (key) {
    case "assistantEnabled":
      return raw === "enabled";
    case "maxReplies":
      return Number(raw) || AI_SETTING_DEFAULTS.maxReplies;
    default:
      return raw;
  }
};

const serialize = (value: AiSettings[keyof AiSettings]): string => {
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  return String(value);
};

export const getAiSettings = async (companyId: number): Promise<AiSettings> => {
  const saved = await Setting.findAll({ where: { companyId } });
  const settings = { ...AI_SETTING_DEFAULTS };

  (Object.keys(AI_SETTING_DEFAULTS) as (keyof AiSettings)[]).forEach(key => {
    const setting = saved.find(item => item.key === `${KEY_PREFIX}${key}`);
    if (setting) {
      (settings as Record<string, unknown>)[key] = parse(key, setting.value);
    }
  });

  return settings;
};

export const updateAiSettings = async (
  companyId: number,
  changes: Partial<AiSettings>
): Promise<AiSettings> => {
  const known: Partial<AiSettings> = {};
  (Object.keys(AI_SETTING_DEFAULTS) as (keyof AiSettings)[]).forEach(key => {
    if (changes[key] !== undefined) {
      (known as Record<string, unknown>)[key] = changes[key];
    }
  });

  let values: Partial<AiSettings>;
  try {
    // Cast too: "true" becomes true and "5" becomes 5.
    values = (await schema.validate(known)) as Partial<AiSettings>;
  } catch (err) {
    throw new AppError(err.message);
  }

  await Promise.all(
    Object.entries(values).map(async ([key, value]) => {
      const text = serialize(
        typeof value === "string" && key !== "instructions"
          ? value.trim()
          : (value as AiSettings[keyof AiSettings])
      );
      const [setting] = await Setting.findOrCreate({
        where: { key: `${KEY_PREFIX}${key}`, companyId },
        defaults: { key: `${KEY_PREFIX}${key}`, value: text, companyId }
      });
      await setting.update({ value: text });
    })
  );

  return getAiSettings(companyId);
};
