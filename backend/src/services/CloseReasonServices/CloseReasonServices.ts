import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import CloseReason from "../../models/CloseReason";

const nameSchema = Yup.string()
  .trim()
  .required("ERR_CLOSE_REASON_INVALID_NAME")
  .max(80, "ERR_CLOSE_REASON_INVALID_NAME");

export const ListCloseReasonsService = (
  companyId: number
): PromiseLike<CloseReason[]> =>
  CloseReason.findAll({ where: { companyId }, order: [["name", "ASC"]] });

// Creates a reason, or renames it when reasonId is given.
export const SaveCloseReasonService = async (
  companyId: number,
  name: string,
  reasonId?: number | string
): Promise<CloseReason> => {
  try {
    await nameSchema.validate(name);
  } catch (err) {
    throw new AppError(err.message);
  }

  const trimmed = name.trim();
  const sameName = await CloseReason.findOne({
    where: {
      companyId,
      name: trimmed,
      ...(reasonId ? { id: { [Op.not]: reasonId } } : {})
    }
  });
  if (sameName) {
    throw new AppError("ERR_CLOSE_REASON_NAME_ALREADY_EXISTS");
  }

  if (!reasonId) {
    return CloseReason.create({ name: trimmed, companyId });
  }

  const reason = await CloseReason.findOne({
    where: { id: reasonId, companyId }
  });
  if (!reason) {
    throw new AppError("ERR_CLOSE_REASON_NOT_FOUND", 404);
  }

  await reason.update({ name: trimmed });
  return reason;
};

// Tickets keep working without the reason (the column is set to null).
export const DeleteCloseReasonService = async (
  companyId: number,
  reasonId: number | string
): Promise<void> => {
  const reason = await CloseReason.findOne({
    where: { id: reasonId, companyId }
  });
  if (!reason) {
    throw new AppError("ERR_CLOSE_REASON_NOT_FOUND", 404);
  }

  await reason.destroy();
};
