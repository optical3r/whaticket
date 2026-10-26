import { Router, Request, Response } from "express";

import { loadCloudCredentials } from "../helpers/CloudApiCredentials";
import { getWebhookSecret } from "../libs/coexy";
import {
  isValidSignature,
  processCloudWebhook,
  processCoexyWebhook
} from "../providers/WhatsApp/Implementations/cloudapi";
import { logger } from "../utils/logger";

// Public endpoint Meta calls. Each connection has its own URL, verify
// token and app secret, shown on the connection screen.
const cloudWebhookRoutes = Router();

const credentialsFor = async (req: Request) => {
  const whatsappId = Number(req.params.whatsappId);
  if (!Number.isInteger(whatsappId)) return null;
  const credentials = await loadCloudCredentials(whatsappId);
  // Coexy connections have no app secret: their events only come through
  // /webhooks/coexy, signed with the platform's secret.
  return credentials?.provider === "meta" ? credentials : null;
};

// Subscription check when the URL is saved in the Meta app.
cloudWebhookRoutes.get(
  "/webhooks/whatsapp-cloud/:whatsappId",
  async (req: Request, res: Response) => {
    const credentials = await credentialsFor(req);
    if (
      credentials &&
      req.query["hub.mode"] === "subscribe" &&
      req.query["hub.verify_token"] === credentials.verifyToken
    ) {
      return res.status(200).send(String(req.query["hub.challenge"] || ""));
    }
    return res.sendStatus(403);
  }
);

cloudWebhookRoutes.post(
  "/webhooks/whatsapp-cloud/:whatsappId",
  async (req: Request, res: Response) => {
    const credentials = await credentialsFor(req);
    const { rawBody } = req as unknown as { rawBody?: Buffer };
    if (
      !credentials ||
      !rawBody ||
      !isValidSignature(
        rawBody,
        req.header("x-hub-signature-256"),
        credentials.appSecret
      )
    ) {
      return res.sendStatus(401);
    }

    // Meta retries slow deliveries: answer first, then process.
    res.sendStatus(200);
    processCloudWebhook(credentials.whatsappId, req.body).catch(err =>
      logger.error({ info: "Cloud API webhook failed", err })
    );
    return undefined;
  }
);

// Coexy delivers the events of every Coexy connection here, signed with
// the secret it gave when the platform's webhook was created
// (X-Coexy-Signature: sha256=<hex of the HMAC of the raw body>).
cloudWebhookRoutes.post(
  "/webhooks/coexy",
  async (req: Request, res: Response) => {
    const secret = await getWebhookSecret();
    const { rawBody } = req as unknown as { rawBody?: Buffer };
    if (
      !secret ||
      !rawBody ||
      !isValidSignature(rawBody, req.header("x-coexy-signature"), secret)
    ) {
      return res.sendStatus(401);
    }

    // Coexy waits 10 seconds at most: answer first, then process.
    res.sendStatus(200);
    processCoexyWebhook(req.body).catch(err =>
      logger.error({ info: "Coexy webhook failed", err })
    );
    return undefined;
  }
);

export default cloudWebhookRoutes;
