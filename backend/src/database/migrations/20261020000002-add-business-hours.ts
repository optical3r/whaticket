import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // JSON stored as text so it behaves the same on MySQL and MariaDB.
    await queryInterface.addColumn("Queues", "schedules", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Queues", "outOfHoursMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Companies", "timezone", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "America/Sao_Paulo"
    });
    await queryInterface.addColumn("Tickets", "outOfHoursNotifiedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "outOfHoursNotifiedAt");
    await queryInterface.removeColumn("Companies", "timezone");
    await queryInterface.removeColumn("Queues", "outOfHoursMessage");
    await queryInterface.removeColumn("Queues", "schedules");
  }
};
