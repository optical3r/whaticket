import { QueryInterface, DataTypes } from "sequelize";

const tables = [
  "Users",
  "Contacts",
  "Tickets",
  "Whatsapps",
  "Queues",
  "QuickAnswers",
  "Settings"
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const table of tables) {
      // Existing rows go to company 1; new rows must always set it.
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addColumn(table, "companyId", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` ALTER COLUMN \`companyId\` DROP DEFAULT`
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const table of tables) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, "companyId");
    }
  }
};
