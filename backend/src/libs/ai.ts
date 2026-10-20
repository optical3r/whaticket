import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Op, fn, col } from "sequelize";

import AppError from "../errors/AppError";
import AiUsage from "../models/AiUsage";
import Company from "../models/Company";
import Plan from "../models/Plan";
import Setting from "../models/Setting";
import { decryptSecret, encryptSecret } from "../helpers/SecretBox";
import { getAiSettings } from "../helpers/AiSettings";
import { logger } from "../utils/logger";

// Every AI feature goes through this module: one place for the model,
// whose key pays, the plan's monthly limit, usage records and errors.

export type AiFeature = "suggest" | "summary" | "rewrite" | "assistant";

type Effort = "low" | "medium" | "high";

interface AiRequest {
  companyId: number;
  feature: AiFeature;
  // Instructions that stay the same between requests of a company, so the
  // API can cache them.
  system: string;
  prompt: string;
  effort?: Effort;
  ticketId?: number;
  userId?: number;
}

const MAX_TOKENS = 16000;

export const aiModel = (): string => process.env.AI_MODEL || "claude-opus-5-5";

export const isAiConfigured = (): boolean =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export type AiKeySource = "platform" | "company";

const CLIENT_OPTIONS = { timeout: 60 * 1000, maxRetries: 2 };

let platformClient: Anthropic | null = null;
// Clients for company keys, reused between requests. Keyed by a hash so
// the map never holds the key itself as an identifier.
const companyClients = new Map<string, Anthropic>();
const MAX_COMPANY_CLIENTS = 200;

const clientFor = (apiKey?: string): Anthropic => {
  if (!apiKey) {
    if (!platformClient) platformClient = new Anthropic(CLIENT_OPTIONS);
    return platformClient;
  }
  const id = crypto.createHash("sha256").update(apiKey).digest("hex");
  let client = companyClients.get(id);
  if (!client) {
    if (companyClients.size >= MAX_COMPANY_CLIENTS) companyClients.clear();
    client = new Anthropic({ ...CLIENT_OPTIONS, apiKey, authToken: null });
    companyClients.set(id, client);
  }
  return client;
};

// Tests point the clients to a fake server between cases.
export const resetAiClient = (): void => {
  platformClient = null;
  companyClients.clear();
};

// Company keys live in Settings, encrypted, and are never sent back to the
// browser: only the last characters, so the admin knows which one is saved.
const KEY_SETTING = "ai.apiKey";
const KEY_HINT_SETTING = "ai.apiKeyHint";

export const getCompanyKey = async (
  companyId: number
): Promise<{ key: string | null; hint: string | null }> => {
  const saved = await Setting.findAll({
    where: { companyId, key: [KEY_SETTING, KEY_HINT_SETTING] }
  });
  const sealed = saved.find(setting => setting.key === KEY_SETTING)?.value;
  const hint = saved.find(setting => setting.key === KEY_HINT_SETTING)?.value;
  if (!sealed) return { key: null, hint: null };

  const key = decryptSecret(sealed);
  if (!key) {
    logger.warn({ info: "Saved AI key can't be decrypted", companyId });
  }
  return { key, hint: hint || null };
};

const looksLikeKey = (value: unknown): value is string =>
  typeof value === "string" && /^sk-ant-[\w-]{20,300}$/.test(value.trim());

// Checks the key with a free call (model lookup) before saving it.
export const saveCompanyKey = async (
  companyId: number,
  apiKey: unknown
): Promise<string> => {
  if (!looksLikeKey(apiKey)) {
    throw new AppError("ERR_AI_INVALID_KEY");
  }
  const key = apiKey.trim();

  try {
    await clientFor(key).models.retrieve(aiModel());
  } catch (err) {
    if (
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.PermissionDeniedError ||
      err instanceof Anthropic.NotFoundError
    ) {
      throw new AppError("ERR_AI_INVALID_KEY");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AppError("ERR_AI_UNAVAILABLE", 502);
    }
    throw err;
  }

  const hint = key.slice(-4);
  await Promise.all(
    [
      [KEY_SETTING, encryptSecret(key)],
      [KEY_HINT_SETTING, hint]
    ].map(async ([settingKey, value]) => {
      const [setting] = await Setting.findOrCreate({
        where: { key: settingKey, companyId },
        defaults: { key: settingKey, value, companyId }
      });
      await setting.update({ value });
    })
  );
  return hint;
};

export const removeCompanyKey = async (companyId: number): Promise<void> => {
  await Setting.destroy({
    where: { companyId, key: [KEY_SETTING, KEY_HINT_SETTING] }
  });
};

const startOfMonth = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

interface PlanAi {
  planEnabled: boolean;
  keySource: AiKeySource;
  // null: no monthly limit (the company pays with its own key).
  limit: number | null;
}

export const getPlanAi = async (companyId: number): Promise<PlanAi> => {
  const company = await Company.findByPk(companyId, {
    include: [
      {
        model: Plan,
        as: "plan",
        attributes: ["aiEnabled", "aiKeySource", "aiMonthlyRequests"]
      }
    ]
  });
  const keySource: AiKeySource =
    company?.plan?.aiKeySource === "company" ? "company" : "platform";
  return {
    planEnabled: Boolean(company?.plan?.aiEnabled),
    keySource,
    limit:
      keySource === "company" ? null : company?.plan?.aiMonthlyRequests || 0
  };
};

export const getMonthlyUsage = async (
  companyId: number,
  now: Date = new Date()
): Promise<{ used: number; limit: number | null }> => {
  const { limit, keySource } = await getPlanAi(companyId);
  const used = await AiUsage.count({
    where: { companyId, keySource, createdAt: { [Op.gte]: startOfMonth(now) } }
  });
  return { used, limit };
};

export interface UsageSummary {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  byFeature: {
    feature: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }[];
}

// This month's requests and tokens of a company, overall and per feature,
// made with the key its plan uses now: a company that pays with its own key
// sees only what went to its own Anthropic account.
export const getUsageSummary = async (
  companyId: number,
  now: Date = new Date()
): Promise<UsageSummary> => {
  const { keySource } = await getPlanAi(companyId);
  const rows = (await AiUsage.findAll({
    where: {
      companyId,
      keySource,
      createdAt: { [Op.gte]: startOfMonth(now) }
    },
    attributes: [
      "feature",
      [fn("COUNT", col("id")), "requests"],
      [fn("SUM", col("inputTokens")), "inputTokens"],
      [fn("SUM", col("outputTokens")), "outputTokens"]
    ],
    group: ["feature"],
    raw: true
  })) as unknown as Record<string, string | number>[];

  const byFeature = rows.map(row => ({
    feature: String(row.feature),
    requests: Number(row.requests),
    inputTokens: Number(row.inputTokens),
    outputTokens: Number(row.outputTokens)
  }));

  return {
    requests: byFeature.reduce((sum, row) => sum + row.requests, 0),
    inputTokens: byFeature.reduce((sum, row) => sum + row.inputTokens, 0),
    outputTokens: byFeature.reduce((sum, row) => sum + row.outputTokens, 0),
    byFeature
  };
};

interface AiAccess {
  allowed: boolean;
  reason?: string;
  keySource: AiKeySource;
  apiKey?: string;
}

// Who decides, in order: the platform (the company's plan), whoever pays
// (Cerqueira Labs' key or the company's own), the company admin (the AI
// switch) and, with the platform key, the monthly limit.
export const getAiAccess = async (
  companyId: number,
  { ignoreLimit = false }: { ignoreLimit?: boolean } = {}
): Promise<AiAccess> => {
  const plan = await getPlanAi(companyId);
  const { keySource } = plan;
  const deny = (reason: string): AiAccess => ({
    allowed: false,
    reason,
    keySource
  });

  if (!plan.planEnabled) return deny("ERR_AI_NOT_IN_PLAN");

  let apiKey: string | undefined;
  if (keySource === "company") {
    apiKey = (await getCompanyKey(companyId)).key || undefined;
    if (!apiKey) return deny("ERR_AI_KEY_MISSING");
  } else {
    if (!isAiConfigured()) return deny("ERR_AI_NOT_CONFIGURED");
    if (plan.limit === 0) return deny("ERR_AI_NOT_IN_PLAN");
  }

  if (!(await getAiSettings(companyId)).enabled) return deny("ERR_AI_DISABLED");

  if (!ignoreLimit && plan.limit !== null) {
    const { used } = await getMonthlyUsage(companyId);
    if (used >= plan.limit) return deny("ERR_AI_LIMIT_REACHED");
  }

  return { allowed: true, keySource, apiKey };
};

const ACCESS_STATUS: Record<string, number> = {
  ERR_AI_NOT_CONFIGURED: 503,
  ERR_AI_NOT_IN_PLAN: 403,
  ERR_AI_KEY_MISSING: 403,
  ERR_AI_DISABLED: 403,
  ERR_AI_LIMIT_REACHED: 429
};

const assertAiAvailable = async (companyId: number): Promise<AiAccess> => {
  const access = await getAiAccess(companyId);
  if (!access.allowed && access.reason) {
    throw new AppError(access.reason, ACCESS_STATUS[access.reason]);
  }
  return access;
};

const toAppError = (err: unknown, keySource: AiKeySource): AppError => {
  if (
    err instanceof Anthropic.AuthenticationError ||
    err instanceof Anthropic.PermissionDeniedError
  ) {
    logger.error({ info: "AI credentials rejected", keySource });
    // A company key that stopped working is for the company admin to fix.
    return keySource === "company"
      ? new AppError("ERR_AI_INVALID_KEY", 403)
      : new AppError("ERR_AI_NOT_CONFIGURED", 503);
  }
  if (
    err instanceof Anthropic.RateLimitError ||
    err instanceof Anthropic.InternalServerError
  ) {
    return new AppError("ERR_AI_BUSY", 503);
  }
  if (err instanceof Anthropic.APIError) {
    logger.error({ info: "AI request failed", status: err.status, err });
    return new AppError("ERR_AI_UNAVAILABLE", 502);
  }
  throw err;
};

const send = async (
  request: AiRequest,
  format?: { type: "json_schema"; schema: Record<string, unknown> }
): Promise<string> => {
  const { keySource, apiKey } = await assertAiAvailable(request.companyId);

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await clientFor(apiKey).beta.messages.create({
      model: aiModel(),
      max_tokens: MAX_TOKENS,
      // If the model declines for policy reasons, the API retries on the
      // fallback model it recommends.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        {
          type: "text",
          text: request.system,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [{ role: "user", content: request.prompt }],
      output_config: {
        effort: request.effort || "medium",
        ...(format ? { format } : {})
      }
    });
  } catch (err) {
    throw toAppError(err, keySource);
  }

  const { usage } = response;
  await AiUsage.create({
    companyId: request.companyId,
    feature: request.feature,
    keySource,
    model: response.model,
    inputTokens:
      usage.input_tokens +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0),
    outputTokens: usage.output_tokens,
    ticketId: request.ticketId,
    userId: request.userId
  });

  if (response.stop_reason === "refusal") {
    throw new AppError("ERR_AI_REFUSED", 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new AppError("ERR_AI_INCOMPLETE", 502);
  }

  const text = response.content
    .map(block => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new AppError("ERR_AI_EMPTY_RESPONSE", 502);
  }

  return text;
};

export const generateText = (request: AiRequest): Promise<string> =>
  send(request);

// The API constrains the answer to the schema; parsing still guards
// against a response cut short.
export const generateJson = async <T>(
  request: AiRequest,
  schema: Record<string, unknown>
): Promise<T> => {
  const text = await send(request, { type: "json_schema", schema });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError("ERR_AI_EMPTY_RESPONSE", 502);
  }
};
