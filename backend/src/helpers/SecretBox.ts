import crypto from "crypto";

import authConfig from "../config/auth";

// Encrypts secrets kept in the database (AES-256-GCM). The key comes from
// DATA_ENCRYPTION_KEY, or from JWT_SECRET when that is not set; changing it
// makes saved secrets unreadable, so they must be entered again.
const encryptionKey = (): Buffer =>
  crypto
    .createHash("sha256")
    .update(
      `secret-box:${process.env.DATA_ENCRYPTION_KEY || authConfig.secret}`
    )
    .digest();

export const encryptSecret = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map(part => part.toString("base64"))
    .join(".");
};

// Returns null when the value was encrypted with another key or changed.
export const decryptSecret = (sealed: string): string | null => {
  try {
    const [iv, tag, data] = sealed
      .split(".")
      .map(part => Buffer.from(part, "base64"));
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return null;
  }
};
