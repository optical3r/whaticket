import Queue from "../../models/Queue";

const ListQueuesService = async (companyId: number): Promise<Queue[]> => {
  const queues = await Queue.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });

  return queues;
};

export default ListQueuesService;
