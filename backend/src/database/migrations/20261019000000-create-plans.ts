import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Plans", {
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
      users: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      connections: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      queues: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
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

    // Default plan for the company that owns the existing data.
    await queryInterface.bulkInsert("Plans", [
      {
        id: 1,
        name: "Interno",
        users: 999,
        connections: 999,
        queues: 999,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("Plans");
  }
};
