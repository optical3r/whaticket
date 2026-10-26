import { Request, Response } from "express";

import {
  coexyWebhookUrl,
  getCoexyKey,
  getCoexyWebhook,
  removeCoexyKey,
  saveCoexyKey,
  setupCoexyWebhook
} from "../libs/coexy";
import CloudApiCredential from "../models/CloudApiCredential";
import Company from "../models/Company";
import Plan from "../models/Plan";
import Whatsapp from "../models/Whatsapp";

// Platform screen: the Coexy key, the webhook every channel posts to, and
// the channels the platform pays for, by company.
const state = async () => {
  const [{ key, hint, source }, webhook] = await Promise.all([
    getCoexyKey(),
    getCoexyWebhook()
  ]);
  return {
    configured: Boolean(key),
    source,
    hint,
    webhook: {
      configured: webhook.configured,
      url: webhook.url,
      expectedUrl: coexyWebhookUrl()
    }
  };
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const rows = await CloudApiCredential.findAll({
    where: { provider: "coexy" },
    attributes: [
      "whatsappId",
      "coexyStatus",
      "displayPhoneNumber",
      "verification",
      "createdAt"
    ],
    include: [
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"],
        include: [
          {
            model: Company,
            as: "company",
            attributes: ["id", "name"],
            include: [
              {
                model: Plan,
                as: "plan",
                attributes: ["name", "coexyMaxChannels"]
              }
            ]
          }
        ]
      }
    ],
    order: [["createdAt", "ASC"]]
  });

  return res.status(200).json({
    ...(await state()),
    channels: rows.map(row => {
      let verification: string | null = null;
      try {
        verification = row.verification
          ? JSON.parse(row.verification).status || null
          : null;
      } catch {
        verification = null;
      }
      return {
        whatsappId: row.whatsappId,
        name: row.whatsapp?.name || null,
        company: row.whatsapp?.company?.name || null,
        plan: row.whatsapp?.company?.plan?.name || null,
        status: row.coexyStatus,
        number: row.displayPhoneNumber,
        verification,
        createdAt: row.createdAt
      };
    })
  });
};

export const saveKey = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await saveCoexyKey(req.body?.apiKey);
  return res.status(200).json(await state());
};

export const removeKey = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await removeCoexyKey();
  return res.status(200).json(await state());
};

export const setupWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await setupCoexyWebhook();
  return res.status(200).json(await state());
};
