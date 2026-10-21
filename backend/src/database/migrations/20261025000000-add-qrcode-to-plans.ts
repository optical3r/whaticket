import { QueryInterface, DataTypes } from "sequelize";

// Plans can leave QR code connections out and sell the official API only.
// Existing plans keep QR code, so no connection stops on the update.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Plans", "qrcodeEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "qrcodeEnabled");
  }
};
