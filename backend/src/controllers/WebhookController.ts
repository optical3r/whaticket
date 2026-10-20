import { Request, Response } from "express";

import {
  DeleteWebhookService,
  ListWebhooksService,
  SaveWebhookService,
  TestWebhookService,
  WEBHOOK_EVENTS
} from "../services/WebhookServices/WebhookServices";

const webhookData = (req: Request) => {
  const { name, url, events, active } = req.body;
  return {
    name,
    url,
    events: Array.isArray(events) ? events : [],
    active
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const webhooks = await ListWebhooksService(req.user.companyId);

  return res.status(200).json({ webhooks, events: WEBHOOK_EVENTS });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const webhook = await SaveWebhookService(
    req.user.companyId,
    webhookData(req)
  );

  return res.status(200).json(webhook);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const webhook = await SaveWebhookService(
    req.user.companyId,
    webhookData(req),
    req.params.webhookId
  );

  return res.status(200).json(webhook);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteWebhookService(req.user.companyId, req.params.webhookId);

  return res.status(200).json({ message: "Webhook deleted" });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const webhook = await TestWebhookService(
    req.user.companyId,
    req.params.webhookId
  );

  return res.status(200).json(webhook);
};
