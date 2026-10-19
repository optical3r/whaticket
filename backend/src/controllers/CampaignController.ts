import { Request, Response } from "express";

import {
  CampaignReportService,
  CancelCampaignService,
  CountAudienceService,
  DeleteCampaignService,
  ListCampaignsService,
  PauseCampaignService,
  ResumeCampaignService,
  SaveCampaignService,
  StartCampaignService,
  assertCampaignsInPlan
} from "../services/CampaignServices/CampaignServices";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const campaigns = await ListCampaignsService(req.user.companyId);

  return res.status(200).json(campaigns);
};

export const audience = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  await assertCampaignsInPlan(companyId);
  const tagIds = String(req.query.tagIds || "")
    .split(",")
    .filter(Boolean);
  const count = await CountAudienceService(companyId, tagIds);

  return res.status(200).json({ count });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const campaign = await SaveCampaignService(req.user.companyId, req.body);

  return res.status(200).json(campaign);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const campaign = await SaveCampaignService(
    req.user.companyId,
    req.body,
    req.params.campaignId
  );

  return res.status(200).json(campaign);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteCampaignService(req.user.companyId, req.params.campaignId);

  return res.status(200).json({ message: "Campaign deleted" });
};

const ACTIONS = {
  start: StartCampaignService,
  pause: PauseCampaignService,
  resume: ResumeCampaignService,
  cancel: CancelCampaignService
};

export const action = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const run = ACTIONS[req.params.action as keyof typeof ACTIONS];
  if (!run) {
    return res.status(404).json({ error: "ERR_NOT_FOUND" });
  }
  const campaign = await run(req.user.companyId, req.params.campaignId);

  return res.status(200).json(campaign);
};

export const report = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const contacts = await CampaignReportService(
    req.user.companyId,
    req.params.campaignId,
    status
  );

  return res.status(200).json(contacts);
};
