import * as Yup from "yup";
import { Op, WhereOptions } from "sequelize";

import AppError from "../../errors/AppError";
import KanbanStage from "../../models/KanbanStage";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";

const MAX_STAGES = 12;
// The board shows the most recent conversations; older ones stay in the list.
const MAX_TICKETS = 300;

const schema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("ERR_KANBAN_INVALID_NAME")
    .max(40, "ERR_KANBAN_INVALID_NAME"),
  color: Yup.string()
    .required("ERR_KANBAN_INVALID_COLOR")
    .matches(/^#[0-9a-f]{3,6}$/i, "ERR_KANBAN_INVALID_COLOR")
});

export const ListStagesService = async (
  companyId: number
): Promise<KanbanStage[]> =>
  KanbanStage.findAll({
    where: { companyId },
    order: [
      ["position", "ASC"],
      ["id", "ASC"]
    ]
  });

export const SaveStageService = async (
  companyId: number,
  data: { name: string; color: string },
  stageId?: number | string
): Promise<KanbanStage> => {
  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }
  const values = { name: data.name.trim(), color: data.color };

  if (!stageId) {
    const count = await KanbanStage.count({ where: { companyId } });
    if (count >= MAX_STAGES) {
      throw new AppError("ERR_KANBAN_TOO_MANY_STAGES");
    }
    return KanbanStage.create({ ...values, position: count, companyId });
  }

  const stage = await KanbanStage.findOne({
    where: { id: stageId, companyId }
  });
  if (!stage) {
    throw new AppError("ERR_KANBAN_STAGE_NOT_FOUND", 404);
  }
  await stage.update(values);
  return stage;
};

export const DeleteStageService = async (
  companyId: number,
  stageId: number | string
): Promise<void> => {
  const stage = await KanbanStage.findOne({
    where: { id: stageId, companyId }
  });
  if (!stage) {
    throw new AppError("ERR_KANBAN_STAGE_NOT_FOUND", 404);
  }
  await Ticket.update(
    { kanbanStageId: null },
    { where: { kanbanStageId: stage.id, companyId } }
  );
  await stage.destroy();
};

// Saves the column order: ids must be exactly the company's stages.
export const ReorderStagesService = async (
  companyId: number,
  ids: unknown
): Promise<KanbanStage[]> => {
  const stages = await ListStagesService(companyId);
  const order = Array.isArray(ids) ? ids.map(Number) : [];
  const sameSet =
    order.length === stages.length &&
    stages.every(stage => order.includes(stage.id));
  if (!sameSet) {
    throw new AppError("ERR_KANBAN_INVALID_ORDER");
  }

  await Promise.all(
    stages.map(stage => stage.update({ position: order.indexOf(stage.id) }))
  );
  return ListStagesService(companyId);
};

// Which tickets the user may see and move: managers see every open or
// waiting conversation; agents see their own and the waiting ones of
// their queues, like in the ticket list.
const visibleTickets = async (
  userId: number | string,
  profile: string,
  companyId: number
): Promise<WhereOptions> => {
  const base = { companyId, status: { [Op.in]: ["pending", "open"] } };
  if (profile === "admin" || profile === "supervisor") return base;

  const user = await ShowUserService(userId, companyId);
  const queueIds = user.queues.map(queue => queue.id);
  return {
    ...base,
    [Op.or]: [
      { userId },
      {
        status: "pending",
        queueId: { [Op.or]: [{ [Op.in]: queueIds }, null] }
      }
    ]
  };
};

export const ListBoardService = async (
  userId: number | string,
  profile: string,
  companyId: number
): Promise<{ stages: KanbanStage[]; tickets: Ticket[] }> => {
  const [stages, where] = await Promise.all([
    ListStagesService(companyId),
    visibleTickets(userId, profile, companyId)
  ]);

  const tickets = await Ticket.findAll({
    where,
    attributes: [
      "id",
      "status",
      "lastMessage",
      "unreadMessages",
      "updatedAt",
      "kanbanStageId",
      "userId",
      "queueId"
    ],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "profilePicUrl"]
      },
      { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
      { model: User, as: "user", attributes: ["id", "name"] },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ],
    order: [["updatedAt", "DESC"]],
    limit: MAX_TICKETS
  });

  return { stages, tickets };
};

export const MoveTicketService = async ({
  ticketId,
  stageId,
  userId,
  profile,
  companyId
}: {
  ticketId: number | string;
  stageId: number | string | null;
  userId: number | string;
  profile: string;
  companyId: number;
}): Promise<Ticket> => {
  const ticket = await Ticket.findOne({
    where: {
      [Op.and]: [
        { id: ticketId },
        await visibleTickets(userId, profile, companyId)
      ]
    }
  });
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  if (stageId !== null && stageId !== undefined && stageId !== "") {
    const stage = await KanbanStage.findOne({
      where: { id: stageId, companyId }
    });
    if (!stage) {
      throw new AppError("ERR_KANBAN_STAGE_NOT_FOUND", 404);
    }
    await ticket.update({ kanbanStageId: stage.id });
  } else {
    await ticket.update({ kanbanStageId: null });
  }

  return ticket;
};
