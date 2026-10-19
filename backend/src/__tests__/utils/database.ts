import database from "../../database";

// MySQL refuses to truncate tables referenced by foreign keys, so the checks
// are disabled on the same connection while the tables are cleared.
const truncate = async (): Promise<void> => {
  await database.transaction(async transaction => {
    await database.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });
    await Promise.all(
      Object.values(database.models).map(model =>
        model.destroy({ truncate: true, force: true, transaction })
      )
    );
    await database.query("SET FOREIGN_KEY_CHECKS = 1", { transaction });
  });
};

const disconnect = async (): Promise<void> => {
  return database.connectionManager.close();
};

export { truncate, disconnect };
