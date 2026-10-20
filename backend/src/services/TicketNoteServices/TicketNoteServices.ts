import * as Yup from "yup";

import AppError from "../../errors/AppError";
import TicketNote from "../../models/TicketNote";
import User from "../../models/User";
import ShowTicketService from "../TicketServices/ShowTicketService";

const MAX_NOTE_LENGTH = 5000;

const withAuthor = {
  include: [{ model: User, as: "user", attributes: ["id", "name"] }]
};

export const ListTicketNotesService = async (
  ticketId: number | string,
  companyId: number
): Promise<TicketNote[]> => {
  await ShowTicketService(ticketId, companyId);

  return TicketNote.findAll({
    where: { ticketId, companyId },
    order: [["createdAt", "ASC"]],
    ...withAuthor
  });
};

export const CreateTicketNoteService = async ({
  ticketId,
  body,
  userId,
  companyId
}: {
  ticketId: number | string;
  body: string;
  userId: number | string;
  companyId: number;
}): Promise<TicketNote> => {
  const ticket = await ShowTicketService(ticketId, companyId);

  const schema = Yup.string()
    .trim()
    .required("ERR_NOTE_EMPTY")
    .max(MAX_NOTE_LENGTH, "ERR_NOTE_TOO_LONG");
  try {
    await schema.validate(body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const note = await TicketNote.create({
    ticketId: ticket.id,
    body: body.trim(),
    userId,
    companyId
  });

  await note.reload(withAuthor);
  return note;
};

// Authors delete their own notes; admins and supervisors can delete any.
export const DeleteTicketNoteService = async ({
  noteId,
  userId,
  profile,
  companyId
}: {
  noteId: number | string;
  userId: number | string;
  profile: string;
  companyId: number;
}): Promise<TicketNote> => {
  const note = await TicketNote.findOne({ where: { id: noteId, companyId } });

  if (!note) {
    throw new AppError("ERR_NOTE_NOT_FOUND", 404);
  }

  const isManager = profile === "admin" || profile === "supervisor";
  if (!isManager && String(note.userId) !== String(userId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await note.destroy();
  return note;
};
