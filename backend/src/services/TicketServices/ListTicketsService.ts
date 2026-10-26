import { Op, WhereOptions, literal, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import ShowUserService from "../UserServices/ShowUserService";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tagIds?: number[];
  companyId: number;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  status,
  date,
  showAll,
  userId,
  withUnreadMessages,
  tagIds = [],
  companyId
}: Request): Promise<Response> => {
  let whereCondition: Filterable["where"] = {
    [Op.or]: [{ userId }, { status: "pending" }],
    queueId: { [Op.or]: [queueIds, null] }
  };
  const includeCondition: Includeable[] = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"],
      through: { attributes: [] }
    }
  ];

  if (showAll === "true") {
    whereCondition = { queueId: { [Op.or]: [queueIds, null] } };
  }

  if (status) {
    whereCondition = {
      ...whereCondition,
      status
    };
  }

  if (date) {
    whereCondition = {
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    };
  }

  if (withUnreadMessages === "true") {
    const user = await ShowUserService(userId, companyId);
    const userQueueIds = user.queues.map(queue => queue.id);

    whereCondition = {
      [Op.or]: [{ userId }, { status: "pending" }],
      queueId: { [Op.or]: [userQueueIds, null] },
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  // Tickets with any of the selected tags. A subquery keeps every tag of the
  // matching tickets in the result, not only the filtered ones.
  const safeTagIds = tagIds.map(Number).filter(Number.isInteger);
  const tagFilter: WhereOptions = safeTagIds.length
    ? {
        id: {
          [Op.in]: literal(
            `(SELECT \`ticketId\` FROM \`TicketTags\` WHERE \`tagId\` IN (${safeTagIds.join(
              ","
            )}))`
          )
        }
      }
    : {};

  // Searches the contact name and number and the message bodies (only the
  // company's, so the search never scans other companies). Subqueries
  // instead of joins: the tags include makes Sequelize paginate the tickets in
  // a subquery, where columns of joined tables are not available.
  const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
  let searchFilter: WhereOptions = {};
  if (sanitizedSearchParam) {
    const pattern = Ticket.sequelize!.escape(
      `%${sanitizedSearchParam.replace(/[\\%_]/g, "\\$&")}%`
    );
    searchFilter = {
      [Op.or]: [
        {
          contactId: {
            [Op.in]: literal(
              `(SELECT \`id\` FROM \`Contacts\` WHERE \`companyId\` = ${Number(
                companyId
              )} AND (LOWER(\`name\`) LIKE ${pattern} OR \`number\` LIKE ${pattern}))`
            )
          }
        },
        {
          id: {
            [Op.in]: literal(
              `(SELECT \`m\`.\`ticketId\` FROM \`Messages\` AS \`m\` INNER JOIN \`Tickets\` AS \`t\` ON \`t\`.\`id\` = \`m\`.\`ticketId\` WHERE \`t\`.\`companyId\` = ${Number(
                companyId
              )} AND LOWER(\`m\`.\`body\`) LIKE ${pattern})`
            )
          }
        }
      ]
    };
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    // The company filter is applied last so no branch above can drop it.
    where: {
      [Op.and]: [whereCondition, tagFilter, searchFilter, { companyId }]
    },
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
