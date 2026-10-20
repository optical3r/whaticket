import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";

const DeleteTagService = async (
  companyId: number,
  tagId: number | string
): Promise<void> => {
  const tag = await Tag.findOne({ where: { id: tagId, companyId } });
  if (!tag) {
    throw new AppError("ERR_TAG_NOT_FOUND", 404);
  }

  await tag.destroy();
};

export default DeleteTagService;
