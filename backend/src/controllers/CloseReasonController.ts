import { Request, Response } from "express";

import {
  DeleteCloseReasonService,
  ListCloseReasonsService,
  SaveCloseReasonService
} from "../services/CloseReasonServices/CloseReasonServices";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const reasons = await ListCloseReasonsService(req.user.companyId);

  return res.status(200).json(reasons);
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
