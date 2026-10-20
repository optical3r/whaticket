import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    // "qrcode" (unofficial clients) today; "cloudapi" is reserved for the
    // official WhatsApp Cloud API provider.
    return queryInterface.addColumn("Whatsapps", "channel", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "qrcode"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Whatsapps", "channel");
  }
};
