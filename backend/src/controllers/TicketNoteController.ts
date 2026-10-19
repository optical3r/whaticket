import { Request, Response } from "express";

import { companyRoom, getIO } from "../libs/socket";
import {
  CreateTicketNoteService,
  DeleteTicketNoteService,
  ListTicketNotesService
} from "../services/TicketNoteServices/TicketNoteServices";

// Notes are only sent to clients that have the ticket open.
const emitToTicket = (
  companyId: number,
  ticketId: number,
  payload: unknown
): void => {
  getIO().to(companyRoom(companyId, ticketId)).emit("ticketNote", payload);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const notes = await ListTicketNotesService(
    req.params.ticketId,
    req.user.companyId
  );

  return res.status(200).json(notes);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;

  const note = await CreateTicketNoteService({
    ticketId: req.params.ticketId,
    body: req.body.body,
    userId,
    companyId
  });

  emitToTicket(companyId, note.ticketId, { action: "create", note });

  return res.status(200).json(note);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId, profile } = req.user;

  const note = await DeleteTicketNoteService({
    noteId: req.params.noteId,
    userId,
    profile,
    companyId
  });

  emitToTicket(companyId, note.ticketId, { action: "delete", noteId: note.id });

  return res.status(200).json({ message: "Note deleted" });
};
