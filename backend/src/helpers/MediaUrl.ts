import { createHmac, timingSafeEqual } from "crypto";
import authConfig from "../config/auth";

const DAY_IN_SECONDS = 24 * 60 * 60;

// Links stay valid for at least one full day. Rounding the expiry to the end
// of the next day keeps the URL stable for a while, so browsers can cache it.
const getExpiry = (): number => {
  const now = Math.floor(Date.now() / 1000);
  return (Math.floor(now / DAY_IN_SECONDS) + 2) * DAY_IN_SECONDS;
};

const sign = (filename: string, expiry: number): string =>
  createHmac("sha256", `${authConfig.secret}:media`)
    .update(`${filename}:${expiry}`)
    .digest("base64url");

export const getSignedMediaPath = (filename: string): string => {
  const expiry = getExpiry();
  return `${expiry}/${sign(filename, expiry)}/${encodeURIComponent(filename)}`;
};

export const isValidMediaSignature = (
  filename: string,
  expiry: string,
  signature: string
): boolean => {
  const expiryNumber = Number(expiry);

  if (
    !Number.isInteger(expiryNumber) ||
    expiryNumber < Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const expected = Buffer.from(sign(filename, expiryNumber));
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
