import { createHmac, randomBytes } from "crypto";
import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { isAllowedUrl, safePost } from "../../helpers/SafeHttpRequest";
import Webhook from "../../models/Webhook";
import { logger } from "../../utils/logger";

export const WEBHOOK_EVENTS = [
  "ticket.created",
  "ticket.closed",
  "ticket.rated",
  "message.received",
  "message.sent"
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | "webhook.test";

const MAX_WEBHOOKS_PER_COMPANY = 10;

interface WebhookData {
  name: string;
  url: string;
  events: string[];
  active?: boolean;
}

const schema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("ERR_WEBHOOK_INVALID_NAME")
    .max(80, "ERR_WEBHOOK_INVALID_NAME"),
  url: Yup.string()
    .required("ERR_WEBHOOK_INVALID_URL")
    .max(2048, "ERR_WEBHOOK_INVALID_URL")
    .test("allowed-url", "ERR_WEBHOOK_INVALID_URL", value =>
      isAllowedUrl(value || "")
    ),
  events: Yup.array()
    .of(Yup.string().oneOf([...WEBHOOK_EVENTS], "ERR_WEBHOOK_INVALID_EVENTS"))
    .min(1, "ERR_WEBHOOK_INVALID_EVENTS")
    .required("ERR_WEBHOOK_INVALID_EVENTS")
});

export const ListWebhooksService = (
  companyId: number
): PromiseLike<Webhook[]> =>
  Webhook.findAll({ where: { companyId }, order: [["name", "ASC"]] });

// Creates a webhook (with a new signing secret), or updates it.
export const SaveWebhookService = async (
  companyId: number,
  data: WebhookData,
  webhookId?: number | string
): Promise<Webhook> => {
  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }

  const values = {
    name: data.name.trim(),
    url: data.url.trim(),
    events: [...new Set(data.events)],
    active: data.active !== false
  };

  if (!webhookId) {
    if (
      (await Webhook.count({ where: { companyId } })) >=
      MAX_WEBHOOKS_PER_COMPANY
    ) {
      throw new AppError("ERR_WEBHOOK_LIMIT");
    }
    return Webhook.create({
      ...values,
      secret: randomBytes(24).toString("hex"),
      companyId
    });
  }

  const webhook = await Webhook.findOne({
    where: { id: webhookId, companyId }
  });
  if (!webhook) {
    throw new AppError("ERR_WEBHOOK_NOT_FOUND", 404);
  }

  await webhook.update(values);
  return webhook;
};

export const DeleteWebhookService = async (
  companyId: number,
  webhookId: number | string
): Promise<void> => {
  const webhook = await Webhook.findOne({
    where: { id: webhookId, companyId }
  });
  if (!webhook) {
    throw new AppError("ERR_WEBHOOK_NOT_FOUND", 404);
  }
  await webhook.destroy();
};

export const signPayload = (secret: string, body: string): string =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

// Sends one event and records the outcome on the webhook.
export const deliverWebhook = async (
  webhook: Webhook,
  event: WebhookEvent,
  data: unknown
): Promise<Webhook> => {
  const body = JSON.stringify({
    event,
    companyId: webhook.companyId,
    sentAt: new Date().toISOString(),
    data
  });

  try {
    const { status } = await safePost(webhook.url, body, {
      "Content-Type": "application/json",
      "User-Agent": "CerqueiraLabs-Webhooks/1.0",
      "X-Webhook-Event": event,
      "X-Webhook-Signature": signPayload(webhook.secret, body)
    });
    await webhook.update({
      lastStatus: status,
      lastError: status >= 200 && status < 300 ? null : `HTTP ${status}`,
      lastSentAt: new Date()
    });
  } catch (err) {
    await webhook.update({
      lastStatus: null,
      lastError: String((err as Error).message || err).slice(0, 500),
      lastSentAt: new Date()
    });
  }

  return webhook;
};

export const TestWebhookService = async (
  companyId: number,
  webhookId: number | string
): Promise<Webhook> => {
  const webhook = await Webhook.findOne({
    where: { id: webhookId, companyId }
  });
  if (!webhook) {
    throw new AppError("ERR_WEBHOOK_NOT_FOUND", 404);
  }
  return deliverWebhook(webhook, "webhook.test", {
    message: "Teste de webhook"
  });
};

// Fire and forget: a slow or broken endpoint never delays the conversation.
export const DispatchWebhookEvent = (
  companyId: number,
  event: WebhookEvent,
  data: unknown
): void => {
  Webhook.findAll({ where: { companyId, active: true } })
    .then(webhooks =>
      Promise.all(
        webhooks
          .filter(webhook => webhook.events.includes(event))
          .map(webhook => deliverWebhook(webhook, event, data))
      )
    )
    .catch(err => logger.error({ info: "Error dispatching webhook", err }));
};
