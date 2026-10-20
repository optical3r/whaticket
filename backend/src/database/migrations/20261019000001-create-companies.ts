import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Companies", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active"
      },
      planId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      termsAcceptedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      termsAcceptedBy: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Company 1 owns everything that existed before multi-tenancy.
    await queryInterface.bulkInsert("Companies", [
      {
        id: 1,
        name: "Cerqueira Labs",
        status: "active",
        planId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("Companies");
  }
};
