import Tag from "../../models/Tag";

const ListTagsService = async (companyId: number): Promise<Tag[]> => {
  return Tag.findAll({ where: { companyId }, order: [["name", "ASC"]] });
};

export default ListTagsService;
