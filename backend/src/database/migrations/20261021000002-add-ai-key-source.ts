import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // "platform": Cerqueira Labs' key pays for the requests.
    // "company": each company enters its own Anthropic key and pays for it.
    await queryInterface.addColumn("Plans", "aiKeySource", {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "platform"
    });
    // Which key each request used, to tell platform cost from client cost.
    await queryInterface.addColumn("AiUsages", "keySource", {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "platform"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("AiUsages", "keySource");
    await queryInterface.removeColumn("Plans", "aiKeySource");
  }
};
