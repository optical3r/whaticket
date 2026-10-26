import { randomBytes } from "crypto";
import * as Yup from "yup";

import AppError from "../errors/AppError";
import CloudApiCredential from "../models/CloudApiCredential";
import type { CoexyChannel } from "../libs/coexy";
import { decryptSecret, encryptSecret } from "./SecretBox";

export interface CloudApiSecrets {
  whatsappId: number;
  // meta: the company's own app; coexy: through Coexy (libs/coexy).
  provider: "meta" | "coexy";
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}

export interface CloudApiInput {
  // coexy: the number is connected through Coexy (libs/coexy) and the
  // fields below are not used.
  provider?: "meta" | "coexy";
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  appSecret?: string;
}

const ID = /^\d{5,32}$/;

const schema = Yup.object().shape({
  phoneNumberId: Yup.string()
    .trim()
    .matches(ID, "ERR_CLOUD_INVALID_CREDENTIALS"),
  wabaId: Yup.string().trim().matches(ID, "ERR_CLOUD_INVALID_CREDENTIALS"),
  accessToken: Yup.string()
    .trim()
    .min(20, "ERR_CLOUD_INVALID_CREDENTIALS")
    .max(1000, "ERR_CLOUD_INVALID_CREDENTIALS"),
  appSecret: Yup.string()
    .trim()
    .min(16, "ERR_CLOUD_INVALID_CREDENTIALS")
    .max(200, "ERR_CLOUD_INVALID_CREDENTIALS")
});

// Saves the credentials of a connection. On an update, empty secret fields
// keep the saved ones, so the screen never has to show them back.
export const saveCloudCredentials = async (
  whatsappId: number,
  input: CloudApiInput
): Promise<CloudApiCredential> => {
  try {
    await schema.validate(input);
  } catch (err) {
    throw new AppError(err.message);
  }

  const existing = await CloudApiCredential.findByPk(whatsappId);
  // Coexy fills these in itself (libs/coexy).
  if (existing?.provider === "coexy") return existing;
  const phoneNumberId = input.phoneNumberId?.trim() || existing?.phoneNumberId;
  const wabaId = input.wabaId?.trim() || existing?.wabaId;
  const accessToken = input.accessToken?.trim();
  const appSecret = input.appSecret?.trim();

  if (
    !phoneNumberId ||
    !wabaId ||
    (!existing && (!accessToken || !appSecret))
  ) {
    throw new AppError("ERR_CLOUD_INVALID_CREDENTIALS");
  }

  const samePhone = await CloudApiCredential.findOne({
    where: { phoneNumberId }
  });
  if (samePhone && samePhone.whatsappId !== whatsappId) {
    throw new AppError("ERR_CLOUD_NUMBER_IN_USE");
  }

  const values = {
    phoneNumberId,
    wabaId,
    ...(accessToken ? { accessToken: encryptSecret(accessToken) } : {}),
    ...(appSecret ? { appSecret: encryptSecret(appSecret) } : {})
  };

  if (existing) {
    await existing.update(values);
    return existing;
  }
  return CloudApiCredential.create({
    whatsappId,
    ...values,
    verifyToken: randomBytes(24).toString("hex")
  });
};

const unseal = (row: CloudApiCredential): CloudApiSecrets | null => {
  const accessToken = decryptSecret(row.accessToken);
  const appSecret = row.appSecret ? decryptSecret(row.appSecret) : null;
  if (!accessToken) return null;
  if (row.provider !== "coexy" && !appSecret) return null;
  return {
    whatsappId: row.whatsappId,
    provider: row.provider === "coexy" ? "coexy" : "meta",
    phoneNumberId: row.phoneNumberId || "",
    wabaId: row.wabaId || "",
    accessToken,
    appSecret: appSecret || "",
    verifyToken: row.verifyToken
  };
};

// Records what Coexy says about a connection's channel. The number's ids
// arrive when the company finishes connecting it.
export const saveCoexyChannel = async (
  whatsappId: number,
  channel: CoexyChannel
): Promise<CloudApiCredential> => {
  if (channel.phone_number_id) {
    const samePhone = await CloudApiCredential.findOne({
      where: { phoneNumberId: channel.phone_number_id }
    });
    if (samePhone && samePhone.whatsappId !== whatsappId) {
      throw new AppError("ERR_CLOUD_NUMBER_IN_USE");
    }
  }

  const values = {
    provider: "coexy" as const,
    coexyChannelId: channel.id,
    coexyStatus: channel.status,
    connectUrl: channel.connect_url || null,
    verification: channel.verification
      ? JSON.stringify(channel.verification)
      : null,
    phoneNumberId: channel.phone_number_id || null,
    wabaId: channel.waba_id || null,
    displayPhoneNumber: channel.display_phone_number || null,
    ...(channel.channel_token
      ? { accessToken: encryptSecret(channel.channel_token) }
      : {})
  };

  const existing = await CloudApiCredential.findByPk(whatsappId);
  if (existing) {
    await existing.update(values);
    return existing;
  }
  if (!channel.channel_token) throw new AppError("ERR_COEXY_UNAVAILABLE", 502);
  return CloudApiCredential.create({
    whatsappId,
    ...values,
    accessToken: encryptSecret(channel.channel_token),
    appSecret: null,
    verifyToken: randomBytes(24).toString("hex")
  });
};

const parseVerification = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return {
      status: parsed.status || "not_verified",
      attempts: Number(parsed.attempts) || 0,
      maxAttempts: Number(parsed.max_attempts) || 3,
      rejectionReasons: Array.isArray(parsed.rejection_reasons)
        ? parsed.rejection_reasons.map(String)
        : [],
      verifiedAt: parsed.verified_at || null,
      url: parsed.url || null
    };
  } catch {
    return null;
  }
};

export const loadCloudCredentials = async (
  whatsappId: number
): Promise<CloudApiSecrets | null> => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  return row ? unseal(row) : null;
};

// What the connection screen may show: never the token or the secret.
// On Coexy connections the connect link is shown to the company admin,
// who opens it (or sends it to the number's owner) to connect the number.
export const publicCloudInfo = async (
  whatsappId: number
): Promise<Record<string, unknown> | null> => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  if (!row) return null;
  if (row.provider === "coexy") {
    return {
      provider: "coexy",
      phoneNumberId: row.phoneNumberId,
      wabaId: row.wabaId,
      displayPhoneNumber: row.displayPhoneNumber,
      coexyStatus: row.coexyStatus,
      connectUrl: row.connectUrl,
      verification: parseVerification(row.verification)
    };
  }
  return {
    provider: "meta",
    phoneNumberId: row.phoneNumberId,
    wabaId: row.wabaId,
    verifyToken: row.verifyToken,
    displayPhoneNumber: row.displayPhoneNumber
  };
};
