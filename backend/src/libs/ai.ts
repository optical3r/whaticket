import Anthropic from "@anthropic-ai/sdk";
import { Op } from "sequelize";

import AppError from "../errors/AppError";
import AiUsage from "../models/AiUsage";
import Company from "../models/Company";
import Plan from "../models/Plan";
import { getAiSettings } from "../helpers/AiSettings";
import { logger } from "../utils/logger";

// Every AI feature goes through this module: one place for the model,
// the plan's monthly limit, usage records and error handling.

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

let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!client) {
    client = new Anthropic({ timeout: 60 * 1000, maxRetries: 2 });
  }
  return client;
};

// Tests point the client to a fake server between cases.
export const resetAiClient = (): void => {
  client = null;
};

const startOfMonth = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const getMonthlyUsage = async (
  companyId: number,
  now: Date = new Date()
): Promise<{ used: number; limit: number; planEnabled: boolean }> => {
  const [used, company] = await Promise.all([
    AiUsage.count({
      where: { companyId, createdAt: { [Op.gte]: startOfMonth(now) } }
    }),
    Company.findByPk(companyId, {
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["aiEnabled", "aiMonthlyRequests"]
        }
      ]
    })
  ]);

  return {
    used,
    limit: company?.plan?.aiMonthlyRequests || 0,
    planEnabled: Boolean(company?.plan?.aiEnabled)
  };
};

// Who decides, in order: the installation (API key), the platform (the
// company's plan) and the company admin (the AI switch).
export const getAiAccess = async (
  companyId: number
): Promise<{ allowed: boolean; reason?: string }> => {
  if (!isAiConfigured()) {
    return { allowed: false, reason: "ERR_AI_NOT_CONFIGURED" };
  }
  const { used, limit, planEnabled } = await getMonthlyUsage(companyId);
  if (!planEnabled || limit === 0) {
    return { allowed: false, reason: "ERR_AI_NOT_IN_PLAN" };
  }
  if (!(await getAiSettings(companyId)).enabled) {
    return { allowed: false, reason: "ERR_AI_DISABLED" };
  }
  if (used >= limit) {
    return { allowed: false, reason: "ERR_AI_LIMIT_REACHED" };
  }
  return { allowed: true };
};

const ACCESS_STATUS: Record<string, number> = {
  ERR_AI_NOT_CONFIGURED: 503,
  ERR_AI_NOT_IN_PLAN: 403,
  ERR_AI_DISABLED: 403,
  ERR_AI_LIMIT_REACHED: 429
};

export const assertAiAvailable = async (companyId: number): Promise<void> => {
  const { allowed, reason } = await getAiAccess(companyId);
  if (!allowed && reason) {
    throw new AppError(reason, ACCESS_STATUS[reason]);
  }
};

const toAppError = (err: unknown): AppError => {
  if (
    err instanceof Anthropic.AuthenticationError ||
    err instanceof Anthropic.PermissionDeniedError
  ) {
    logger.error({ info: "AI credentials rejected", err: err.message });
    return new AppError("ERR_AI_NOT_CONFIGURED", 503);
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
  await assertAiAvailable(request.companyId);

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await getClient().beta.messages.create({
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
    throw toAppError(err);
  }

  const { usage } = response;
  await AiUsage.create({
    companyId: request.companyId,
    feature: request.feature,
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
