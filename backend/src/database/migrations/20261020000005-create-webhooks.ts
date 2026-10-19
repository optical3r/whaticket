import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("Webhooks", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: { type: DataTypes.STRING, allowNull: false },
      url: { type: DataTypes.STRING(2048), allowNull: false },
      secret: { type: DataTypes.STRING, allowNull: false },
      // JSON list of event names, stored as text.
      events: { type: DataTypes.TEXT, allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lastStatus: { type: DataTypes.INTEGER, allowNull: true },
      lastError: { type: DataTypes.TEXT, allowNull: true },
      lastSentAt: { type: DataTypes.DATE, allowNull: true },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("Webhooks");
  }
};
