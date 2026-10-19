import { Request, Response } from "express";

import { emitToCompany } from "../libs/socket";
import {
  DeleteStageService,
  ListBoardService,
  MoveTicketService,
  ReorderStagesService,
  SaveStageService
} from "../services/KanbanServices/KanbanServices";

export const board = async (req: Request, res: Response): Promise<Response> => {
  const { id, profile, companyId } = req.user;
  const data = await ListBoardService(id, profile, companyId);

  return res.status(200).json(data);
};

export const storeStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const stage = await SaveStageService(companyId, req.body);
  emitToCompany(companyId, "kanban", { action: "stages" });

  return res.status(200).json(stage);
};

export const updateStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const stage = await SaveStageService(companyId, req.body, req.params.stageId);
  emitToCompany(companyId, "kanban", { action: "stages" });

  return res.status(200).json(stage);
};

export const removeStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  await DeleteStageService(companyId, req.params.stageId);
  emitToCompany(companyId, "kanban", { action: "stages" });

  return res.status(200).json({ message: "Stage deleted" });
};

export const reorderStages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const stages = await ReorderStagesService(companyId, req.body.ids);
  emitToCompany(companyId, "kanban", { action: "stages" });

  return res.status(200).json(stages);
};

export const moveTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id, profile, companyId } = req.user;
  const ticket = await MoveTicketService({
    ticketId: req.params.ticketId,
    stageId: req.body.stageId ?? null,
    userId: id,
    profile,
    companyId
  });
  emitToCompany(companyId, "kanban", {
    action: "move",
    ticketId: ticket.id,
    kanbanStageId: ticket.kanbanStageId
  });

  return res.status(200).json({
    id: ticket.id,
    kanbanStageId: ticket.kanbanStageId
  });
};
