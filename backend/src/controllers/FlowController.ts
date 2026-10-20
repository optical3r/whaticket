import { Request, Response } from "express";

import {
  DeleteFlowService,
  FlowConnectionsService,
  ListFlowsService,
  SaveFlowService,
  ShowFlowService
} from "../services/FlowServices/FlowServices";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const [flows, connections] = await Promise.all([
    ListFlowsService(companyId),
    FlowConnectionsService(companyId)
  ]);

  return res.status(200).json(
    flows.map(flow => ({
      id: flow.id,
      name: flow.name,
      steps: flow.definition.steps.length,
      updatedAt: flow.updatedAt,
      connections: connections
        .filter(connection => connection.flowId === flow.id)
        .map(connection => ({ id: connection.id, name: connection.name }))
    }))
  );
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const flow = await ShowFlowService(req.user.companyId, req.params.flowId);

  return res.status(200).json(flow);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const flow = await SaveFlowService(req.user.companyId, req.body);

  return res.status(200).json(flow);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const flow = await SaveFlowService(
    req.user.companyId,
    req.body,
    req.params.flowId
  );

  return res.status(200).json(flow);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteFlowService(req.user.companyId, req.params.flowId);

  return res.status(200).json({ message: "Flow deleted" });
};
