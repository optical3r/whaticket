import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Whether companies on the plan can use the AI module at all.
    await queryInterface.addColumn("Plans", "aiEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    // Plan 1 ("Interno") holds Cerqueira Labs' own company.
    await queryInterface.bulkUpdate("Plans", { aiEnabled: true }, { id: 1 });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "aiEnabled");
  }
};
