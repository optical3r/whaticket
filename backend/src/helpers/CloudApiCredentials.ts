import { randomBytes } from "crypto";
import * as Yup from "yup";

import AppError from "../errors/AppError";
import CloudApiCredential from "../models/CloudApiCredential";
import { decryptSecret, encryptSecret } from "./SecretBox";

export interface CloudApiSecrets {
  whatsappId: number;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}

export interface CloudApiInput {
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
  const appSecret = decryptSecret(row.appSecret);
  if (!accessToken || !appSecret) return null;
  return {
    whatsappId: row.whatsappId,
    phoneNumberId: row.phoneNumberId,
    wabaId: row.wabaId,
    accessToken,
    appSecret,
    verifyToken: row.verifyToken
  };
};

export const loadCloudCredentials = async (
  whatsappId: number
): Promise<CloudApiSecrets | null> => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  return row ? unseal(row) : null;
};

// What the connection screen may show: never the token or the secret.
export const publicCloudInfo = async (
  whatsappId: number
): Promise<Record<string, string | null> | null> => {
  const row = await CloudApiCredential.findByPk(whatsappId);
  if (!row) return null;
  return {
    phoneNumberId: row.phoneNumberId,
    wabaId: row.wabaId,
    verifyToken: row.verifyToken,
    displayPhoneNumber: row.displayPhoneNumber
  };
};
