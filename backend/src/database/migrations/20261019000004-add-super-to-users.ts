import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "super", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // The oldest admin of an existing install manages the companies.
    await queryInterface.sequelize.query(
      "UPDATE `Users` SET `super` = true WHERE `id` = (SELECT `id` FROM (SELECT MIN(`id`) AS `id` FROM `Users` WHERE `profile` = 'admin') AS `firstAdmin`)"
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Users", "super");
  }
};
