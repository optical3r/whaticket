import { QueryInterface, DataTypes } from "sequelize";

// Campaigns on official (Cloud API) connections send an approved template
// instead of free text.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Campaigns", "templateName", {
      type: DataTypes.STRING(512),
      allowNull: true
    });
    await queryInterface.addColumn("Campaigns", "templateLanguage", {
      type: DataTypes.STRING(20),
      allowNull: true
    });
    // JSON list with one value per {{n}} of the template body.
    await queryInterface.addColumn("Campaigns", "templateParams", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "templateParams");
    await queryInterface.removeColumn("Campaigns", "templateLanguage");
    await queryInterface.removeColumn("Campaigns", "templateName");
  }
};
