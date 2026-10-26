import { Op } from "sequelize";

import AppError from "../errors/AppError";
import { decryptSecret, encryptSecret } from "../helpers/SecretBox";
import CloudApiCredential from "../models/CloudApiCredential";
import Company from "../models/Company";
import Plan from "../models/Plan";
import PlatformSetting from "../models/PlatformSetting";
import Whatsapp from "../models/Whatsapp";
import { logger } from "../utils/logger";

// Coexy (docs/coexy-spec.md) connects a company's WhatsApp number to the
// official API from a link, with no app of the company's own on Meta. The
// platform has one Coexy account: its API key manages the channels (one
// per connection) and one webhook delivers the events of every channel.
// Messages go through Coexy's proxy of the Graph API with each channel's
// token (providers/WhatsApp/Implementations/cloudapi.ts).

const baseUrl = (): string =>
  (process.env.COEXY_API_URL || "https://api.coexy.com.br/functions/v1")
    // eslint-disable-next-line no-useless-escape
    .replace(/\/+$/, "");

export const coexyProxyUrl = (): string => `${baseUrl()}/meta-proxy`;

// messages: customers' messages and the status of sent ones;
// smb_message_echoes: messages sent from the WhatsApp Business app on the
// phone (coexistence); channel_health_update: the number got restricted,
// blocked or banned, or its quality dropped.
export const COEXY_WEBHOOK_EVENTS = [
  "messages",
  "smb_message_echoes",
  "channel_health_update"
];

const KEY = "coexy.apiKey";
const KEY_HINT = "coexy.apiKeyHint";
const WEBHOOK_ID = "coexy.webhookId";
const WEBHOOK_URL = "coexy.webhookUrl";
const WEBHOOK_SECRET = "coexy.webhookSecret";

export type CoexyChannelStatus =
  | "pending"
  | "active"
  | "disconnected"
  | "suspended";

export interface CoexyVerification {
  status: "not_verified" | "pending" | "verified" | "rejected" | "failed";
  attempts: number;
  max_attempts: number;
  rejection_reasons: string[] | null;
  verified_at: string | null;
  url: string | null;
}

export interface CoexyChannel {
  id: string;
  name: string;
  status: CoexyChannelStatus;
  display_phone_number: string | null;
  phone_number_id: string | null;
  waba_id: string | null;
  channel_token: string;
  connect_url: string;
  connected_at: string | null;
  created_at: string;
  verification?: CoexyVerification | null;
}

interface CoexyWebhook {
  id: string;
  url: string;
  hmac_secret: string;
}

const settings = async (
  keys: string[]
): Promise<Record<string, string | null>> => {
  const rows = await PlatformSetting.findAll({ where: { key: keys } });
  return keys.reduce(
    (all, key) => ({
      ...all,
      [key]: rows.find(row => row.key === key)?.value ?? null
    }),
    {} as Record<string, string | null>
  );
};

const saveSetting = (key: string, value: string | null) =>
  PlatformSetting.upsert({ key, value });

export type CoexyKeySource = "platform" | "env" | null;

// The key saved on the platform screen wins; COEXY_API_KEY in the
// environment is the fallback for installations configured by file.
export const getCoexyKey = async (): Promise<{
  key: string | null;
  hint: string | null;
  source: CoexyKeySource;
}> => {
  const saved = await settings([KEY, KEY_HINT]);
  const key = saved[KEY] ? decryptSecret(saved[KEY] as string) : null;
  if (key) {
    return { key, hint: saved[KEY_HINT] || key.slice(-4), source: "platform" };
  }
  const env = process.env.COEXY_API_KEY;
  if (env) return { key: env, hint: env.slice(-4), source: "env" };
  return { key: null, hint: null, source: null };
};

// Secret Coexy signs the webhook deliveries with. It is only shown when
// the webhook is created, so it is saved right then.
export const getWebhookSecret = async (): Promise<string | null> => {
  const saved = await settings([WEBHOOK_SECRET]);
  const secret = saved[WEBHOOK_SECRET]
    ? decryptSecret(saved[WEBHOOK_SECRET] as string)
    : null;
  return secret || process.env.COEXY_HMAC_SECRET || null;
};

const errorFor = (status: number): AppError => {
  if (status === 401) return new AppError("ERR_COEXY_INVALID_KEY");
  if (status === 404) return new AppError("ERR_COEXY_NOT_FOUND", 404);
  if (status === 429) return new AppError("ERR_COEXY_RATE_LIMITED", 429);
  return new AppError("ERR_COEXY_UNAVAILABLE", 502);
};

// Management API (/api): channels and webhooks, with the platform key.
const request = async <T>(
  method: string,
  path: string,
  body?: unknown,
  apiKey?: string
): Promise<T> => {
  const key = apiKey || (await getCoexyKey()).key;
  if (!key) throw new AppError("ERR_COEXY_NOT_CONFIGURED");

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api${path}`, {
      method,
      headers: {
        "x-api-key": key,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20 * 1000)
    });
  } catch (err) {
    logger.warn({ info: "Coexy request failed", path, err });
    throw new AppError("ERR_COEXY_UNAVAILABLE", 502);
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    logger.warn({
      info: "Coexy request refused",
      path,
      status: response.status,
      error: data.error
    });
    throw errorFor(response.status);
  }
  if (response.status === 204) return undefined as unknown as T;
  return (await response.json().catch(() => undefined)) as T;
};

// Checks the key with Coexy before saving, so a typo is caught here and
// not when a company tries to connect.
export const saveCoexyKey = async (input: unknown): Promise<string> => {
  const key = typeof input === "string" ? input.trim() : "";
  if (!/^[\w-]{16,400}$/.test(key)) {
    throw new AppError("ERR_COEXY_INVALID_KEY");
  }
  await request("GET", "/channels", undefined, key);
  const hint = key.slice(-4);
  await saveSetting(KEY, encryptSecret(key));
  await saveSetting(KEY_HINT, hint);
  return hint;
};

export const removeCoexyKey = async (): Promise<void> => {
  await PlatformSetting.destroy({ where: { key: [KEY, KEY_HINT] } });
};

// The address Coexy posts to. Coexy only delivers to HTTPS.
export const coexyWebhookUrl = (): string => {
  if (process.env.COEXY_WEBHOOK_URL) return process.env.COEXY_WEBHOOK_URL;
  const backend = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  const port = process.env.PROXY_PORT;
  const withPort =
    port && port !== "443" && port !== "80" ? `${backend}:${port}` : backend;
  return `${withPort}/webhooks/coexy`;
};

export const getCoexyWebhook = async (): Promise<{
  id: string | null;
  url: string | null;
  configured: boolean;
}> => {
  const saved = await settings([WEBHOOK_ID, WEBHOOK_URL]);
  return {
    id: saved[WEBHOOK_ID],
    url: saved[WEBHOOK_URL],
    configured: Boolean(await getWebhookSecret())
  };
};

// Creates the platform's webhook (all channels), replacing the previous
// one: its secret cannot be read again, so a new webhook is the only way
// to get a known one.
export const setupCoexyWebhook = async (): Promise<{
  id: string;
  url: string;
}> => {
  const url = coexyWebhookUrl();
  if (!url.startsWith("https://")) {
    throw new AppError("ERR_COEXY_WEBHOOK_HTTPS");
  }

  const previous = (await settings([WEBHOOK_ID]))[WEBHOOK_ID];
  if (previous) {
    await request("DELETE", `/webhooks/${previous}`).catch(err => {
      if (!(err instanceof AppError) || err.statusCode !== 404) throw err;
    });
  }

  const webhook = await request<CoexyWebhook>("POST", "/webhooks", {
    name: "Cerqueira Labs atendimento",
    url,
    events: COEXY_WEBHOOK_EVENTS
  });
  if (!webhook?.id || !webhook.hmac_secret) {
    throw new AppError("ERR_COEXY_UNAVAILABLE", 502);
  }
  await saveSetting(WEBHOOK_ID, webhook.id);
  await saveSetting(WEBHOOK_URL, webhook.url || url);
  await saveSetting(WEBHOOK_SECRET, encryptSecret(webhook.hmac_secret));
  return { id: webhook.id, url: webhook.url || url };
};

export const isCoexyReady = async (): Promise<boolean> =>
  Boolean((await getCoexyKey()).key && (await getWebhookSecret()));

export const createCoexyChannel = (name: string): Promise<CoexyChannel> =>
  request<CoexyChannel>("POST", "/channels", { name: name.slice(0, 120) });

export const getCoexyChannel = (id: string): Promise<CoexyChannel> =>
  request<CoexyChannel>("GET", `/channels/${encodeURIComponent(id)}`);

export const listCoexyChannels = async (): Promise<CoexyChannel[]> => {
  const result = await request<CoexyChannel[] | { data?: CoexyChannel[] }>(
    "GET",
    "/channels"
  );
  return Array.isArray(result) ? result : result?.data || [];
};

// An active channel is only deleted with force; a channel Coexy no
// longer has is already gone.
export const deleteCoexyChannel = async (id: string): Promise<void> => {
  try {
    await request("DELETE", `/channels/${encodeURIComponent(id)}?force=true`);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) return;
    throw err;
  }
};

// Plan rules: the module must be on, and each channel counts against the
// plan's limit because the platform pays for it.
export const coexyChannelsOf = async (companyId: number): Promise<number> =>
  CloudApiCredential.count({
    where: { provider: "coexy" },
    include: [
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: [],
        where: { companyId },
        required: true
      }
    ]
  });

export const getCoexyAccess = async (
  companyId: number
): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  max: number;
}> => {
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "planId"],
    include: [
      {
        model: Plan,
        as: "plan",
        attributes: ["coexyEnabled", "coexyMaxChannels"]
      }
    ]
  });
  const max = company?.plan?.coexyMaxChannels ?? 0;
  const used = await coexyChannelsOf(companyId);
  if (!company?.plan?.coexyEnabled) {
    return { allowed: false, reason: "ERR_COEXY_NOT_IN_PLAN", used, max };
  }
  if (!(await isCoexyReady())) {
    return { allowed: false, reason: "ERR_COEXY_NOT_CONFIGURED", used, max };
  }
  if (max > 0 && used >= max) {
    return { allowed: false, reason: "ERR_COEXY_LIMIT_REACHED", used, max };
  }
  return { allowed: true, used, max };
};

export const assertCoexyAllowed = async (companyId: number): Promise<void> => {
  const access = await getCoexyAccess(companyId);
  if (!access.allowed) throw new AppError(access.reason as string, 403);
};

// Channels waiting for the number (or for a reconnection) are checked
// often; the others now and then.
export const coexyRowsToCheck = async (
  onlyWaiting: boolean
): Promise<CloudApiCredential[]> =>
  CloudApiCredential.findAll({
    where: {
      provider: "coexy",
      ...(onlyWaiting
        ? {
            coexyStatus: { [Op.in]: ["pending", "disconnected"] },
            updatedAt: { [Op.gte]: new Date(Date.now() - 2 * 24 * 3600 * 1000) }
          }
        : {})
    }
  });
