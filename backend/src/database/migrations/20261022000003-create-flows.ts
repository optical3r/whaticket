import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Flows", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: { type: DataTypes.STRING(80), allowNull: false },
      // JSON: { startId, nodes: [...] }, validated by FlowServices.
      definition: { type: DataTypes.TEXT, allowNull: false },
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

    // A connection with a flow uses it instead of the queue menu.
    await queryInterface.addColumn("Whatsapps", "flowId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Flows", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    // Where each conversation is in its flow.
    await queryInterface.addColumn("Tickets", "flowId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Flows", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("Tickets", "flowStepId", {
      type: DataTypes.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn("Tickets", "flowAttempts", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Tickets", "flowFinishedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "flowFinishedAt");
    await queryInterface.removeColumn("Tickets", "flowAttempts");
    await queryInterface.removeColumn("Tickets", "flowStepId");
    await queryInterface.removeColumn("Tickets", "flowId");
    await queryInterface.removeColumn("Whatsapps", "flowId");
    await queryInterface.dropTable("Flows");
  }
};
