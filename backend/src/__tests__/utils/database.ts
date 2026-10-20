import { Op } from "sequelize";
import database from "../../database";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

// The migrations create company 1 and plan 1, which own the data of existing
// installs. Tests keep them and remove everything else.
const keptModels = ["Company", "Plan"];

// MySQL refuses to truncate tables referenced by foreign keys, so the checks
// are disabled on the same connection while the tables are cleared.
const truncate = async (): Promise<void> => {
  await database.transaction(async transaction => {
    await database.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });
    await Promise.all(
      Object.values(database.models)
        .filter(model => !keptModels.includes(model.name))
        .map(model =>
          model.destroy({ truncate: true, force: true, transaction })
        )
    );
    await Company.destroy({ where: { id: { [Op.ne]: 1 } }, transaction });
    await Plan.destroy({ where: { id: { [Op.ne]: 1 } }, transaction });
    await Company.update(
      {
        status: "active",
        planId: 1,
        termsAcceptedAt: null,
        termsAcceptedBy: null
      },
      { where: { id: 1 }, transaction }
    );
    await database.query("SET FOREIGN_KEY_CHECKS = 1", { transaction });
  });
};

const disconnect = async (): Promise<void> => {
  return database.connectionManager.close();
};

export { truncate, disconnect };
