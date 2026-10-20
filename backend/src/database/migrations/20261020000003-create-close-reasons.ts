import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CloseReasons", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: { type: DataTypes.STRING, allowNull: false },
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
    await queryInterface.addIndex("CloseReasons", ["companyId", "name"], {
      unique: true,
      name: "CloseReasons_companyId_name_unique"
    });

    await queryInterface.addColumn("Tickets", "closeReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "CloseReasons", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("Tickets", "closedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "closedAt");
    await queryInterface.removeColumn("Tickets", "closeReasonId");
    await queryInterface.dropTable("CloseReasons");
  }
};
