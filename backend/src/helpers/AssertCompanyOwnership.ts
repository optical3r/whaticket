import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";

type CountInCompany = (
  ids: Array<number | string>,
  companyId: number
) => PromiseLike<number>;

const assertOwned = async (
  countInCompany: CountInCompany,
  ids: Array<number | string | null | undefined>,
  companyId: number,
  error: string
): Promise<void> => {
  const uniqueIds = [
    ...new Set(
      ids
        .filter(id => id !== null && id !== undefined && id !== "")
        .map(id => Number(id))
    )
  ];
  if (uniqueIds.length === 0) return;

  const found = await countInCompany(uniqueIds, companyId);

  if (found !== uniqueIds.length) {
    throw new AppError(error, 404);
  }
};

// Ids that arrive in request bodies (queue, user, connection) must belong to
// the caller's company before they are linked to anything.
export const assertQueuesInCompany = (
  queueIds: Array<number | string | null | undefined>,
  companyId: number
): Promise<void> =>
  assertOwned(
    (ids, id) =>
      Queue.count({ where: { id: { [Op.in]: ids }, companyId: id } }),
    queueIds,
    companyId,
    "ERR_QUEUE_NOT_FOUND"
  );

export const assertUserInCompany = (
  userId: number | string | null | undefined,
  companyId: number
): Promise<void> =>
  assertOwned(
    (ids, id) => User.count({ where: { id: { [Op.in]: ids }, companyId: id } }),
    [userId],
    companyId,
    "ERR_NO_USER_FOUND"
  );

export const assertWhatsappInCompany = (
  whatsappId: number | string | null | undefined,
  companyId: number
): Promise<void> =>
  assertOwned(
    (ids, id) =>
      Whatsapp.count({ where: { id: { [Op.in]: ids }, companyId: id } }),
    [whatsappId],
    companyId,
    "ERR_NO_WAPP_FOUND"
  );
