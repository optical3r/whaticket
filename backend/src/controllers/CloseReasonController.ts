import { Request, Response } from "express";

import { isSettingEnabled } from "../helpers/CompanySettings";

import {
  DeleteCloseReasonService,
  ListCloseReasonsService,
  SaveCloseReasonService
} from "../services/CloseReasonServices/CloseReasonServices";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const reasons = await ListCloseReasonsService(companyId);
  // Agents can't read the settings, so they learn here if a reason is needed.
  const required =
    reasons.length > 0 &&
    (await isSettingEnabled(companyId, "closeReasonRequired"));

  return res.status(200).json({ reasons, required });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const reason = await SaveCloseReasonService(
    req.user.companyId,
    req.body.name
  );

  return res.status(200).json(reason);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const reason = await SaveCloseReasonService(
    req.user.companyId,
    req.body.name,
    req.params.reasonId
  );

  return res.status(200).json(reason);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteCloseReasonService(req.user.companyId, req.params.reasonId);

  return res.status(200).json({ message: "Close reason deleted" });
};
