import { Request, Response } from "express";

import { companyRoom, emitToCompany, getIO } from "../libs/socket";
import DeleteTagService from "../services/TagServices/DeleteTagService";
import ListTagsService from "../services/TagServices/ListTagsService";
import SaveTagService from "../services/TagServices/SaveTagService";
import SetContactTagsService from "../services/TagServices/SetContactTagsService";
import SetTicketTagsService from "../services/TagServices/SetTicketTagsService";

const parseTagIds = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];

export const index = async (req: Request, res: Response): Promise<Response> => {
  const tags = await ListTagsService(req.user.companyId);

  return res.status(200).json(tags);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, color } = req.body;

  const tag = await SaveTagService(companyId, { name, color });
  emitToCompany(companyId, "tag", { action: "update", tag });

  return res.status(200).json(tag);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { tagId } = req.params;
  const { name, color } = req.body;

  const tag = await SaveTagService(companyId, { name, color }, tagId);
  emitToCompany(companyId, "tag", { action: "update", tag });

  return res.status(200).json(tag);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { tagId } = req.params;

  await DeleteTagService(companyId, tagId);
  emitToCompany(companyId, "tag", { action: "delete", tagId: +tagId });

  return res.status(200).json({ message: "Tag deleted" });
};

export const setTicketTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { ticketId } = req.params;

  const ticket = await SetTicketTagsService(
    ticketId,
    parseTagIds(req.body.tagIds),
    companyId
  );

  getIO()
    .to(companyRoom(companyId, ticket.status))
    .to(companyRoom(companyId, ticket.id))
    .emit("ticket", { action: "update", ticket });

  return res.status(200).json(ticket);
};

export const setContactTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { contactId } = req.params;

  const contact = await SetContactTagsService(
    contactId,
    parseTagIds(req.body.tagIds),
    companyId
  );

  emitToCompany(companyId, "contact", { action: "update", contact });

  return res.status(200).json(contact);
};
