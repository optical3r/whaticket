import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

export interface CompanyUsage {
  users: number;
  connections: number;
  queues: number;
}

const CompanyUsageService = async (
  companyId: number
): Promise<CompanyUsage> => {
  const [users, connections, queues] = await Promise.all([
    User.count({ where: { companyId } }),
    Whatsapp.count({ where: { companyId } }),
    Queue.count({ where: { companyId } })
  ]);

  return { users, connections, queues };
};

export default CompanyUsageService;
