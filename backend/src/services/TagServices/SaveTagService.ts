import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";

interface TagData {
  name: string;
  color: string;
}

const schema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("ERR_TAG_INVALID_NAME")
    .min(1, "ERR_TAG_INVALID_NAME")
    .max(40, "ERR_TAG_INVALID_NAME"),
  color: Yup.string()
    .required("ERR_TAG_INVALID_COLOR")
    .matches(/^#[0-9a-f]{3,6}$/i, "ERR_TAG_INVALID_COLOR")
});

// Creates a tag, or updates it when tagId is given.
const SaveTagService = async (
  companyId: number,
  { name, color }: TagData,
  tagId?: number | string
): Promise<Tag> => {
  try {
    await schema.validate({ name, color });
  } catch (err) {
    throw new AppError(err.message);
  }

  const trimmed = name.trim();
  const sameName = await Tag.findOne({
    where: {
      companyId,
      name: trimmed,
      ...(tagId ? { id: { [Op.not]: tagId } } : {})
    }
  });
  if (sameName) {
    throw new AppError("ERR_TAG_NAME_ALREADY_EXISTS");
  }

  if (!tagId) {
    return Tag.create({ name: trimmed, color, companyId });
  }

  const tag = await Tag.findOne({ where: { id: tagId, companyId } });
  if (!tag) {
    throw new AppError("ERR_TAG_NOT_FOUND", 404);
  }

  await tag.update({ name: trimmed, color });
  return tag;
};

export default SaveTagService;
