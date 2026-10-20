import { Request, Response } from "express";

import {
  getPlatformKey,
  getUsageByCompany,
  removePlatformKey,
  savePlatformKey,
  transcriptionModel
} from "../libs/transcription";
import Company from "../models/Company";
import Plan from "../models/Plan";

// Platform screen: the OpenAI key the platform pays with, and the minutes
// each company used this month.
export const show = async (req: Request, res: Response): Promise<Response> => {
  const [{ key, hint, source }, usage, companies] = await Promise.all([
    getPlatformKey(),
    getUsageByCompany(),
    Company.findAll({
      attributes: ["id", "name", "status"],
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: [
            "id",
            "name",
            "transcriptionEnabled",
            "transcriptionMonthlyMinutes"
          ]
        }
      ],
      order: [["name", "ASC"]]
    })
  ]);

  return res.status(200).json({
    configured: Boolean(key),
    source,
    hint,
    model: transcriptionModel(),
    companies: companies.map(company => {
      const used = usage.find(row => row.companyId === company.id);
      return {
        id: company.id,
        name: company.name,
        plan: company.plan?.name || null,
        enabled: Boolean(company.plan?.transcriptionEnabled),
        limitMinutes: company.plan?.transcriptionMonthlyMinutes ?? 0,
        seconds: used?.seconds || 0,
        notes: used?.notes || 0
      };
    })
  });
};

export const saveKey = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const hint = await savePlatformKey(req.body?.apiKey);
  return res.status(200).json({ configured: true, source: "platform", hint });
};

export const removeKey = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await removePlatformKey();
  const { key, hint, source } = await getPlatformKey();
  return res.status(200).json({ configured: Boolean(key), source, hint });
};
