import { Sequelize, Op, literal, WhereOptions } from "sequelize";
import Tag from "../../models/Tag";
import Contact from "../../models/Contact";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  tagId?: number | string;
  companyId: number;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  tagId,
  companyId
}: Request): Promise<Response> => {
  const whereCondition = {
    companyId,
    [Op.or]: [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("Contact.name")),
          "LIKE",
          `%${searchParam.toLowerCase().trim()}%`
        )
      },
      { number: { [Op.like]: `%${searchParam.toLowerCase().trim()}%` } }
    ]
  };
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const safeTagId = Number(tagId);
  const tagFilter: WhereOptions =
    Number.isInteger(safeTagId) && safeTagId > 0
      ? {
          id: {
            [Op.in]: literal(
              `(SELECT \`contactId\` FROM \`ContactTags\` WHERE \`tagId\` = ${safeTagId})`
            )
          }
        }
      : {};

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: { [Op.and]: [whereCondition, tagFilter] },
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ],
    distinct: true,
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
