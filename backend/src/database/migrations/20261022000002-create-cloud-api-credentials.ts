import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Credentials of connections on the official WhatsApp Cloud API. Kept
    // apart from Whatsapps so they never go out with the connection list.
    await queryInterface.createTable("CloudApiCredentials", {
      whatsappId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      phoneNumberId: { type: DataTypes.STRING(64), allowNull: false },
      wabaId: { type: DataTypes.STRING(64), allowNull: false },
      // Encrypted (helpers/SecretBox).
      accessToken: { type: DataTypes.TEXT, allowNull: false },
      appSecret: { type: DataTypes.TEXT, allowNull: false },
      verifyToken: { type: DataTypes.STRING(64), allowNull: false },
      displayPhoneNumber: { type: DataTypes.STRING(32), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("CloudApiCredentials", ["phoneNumberId"], {
      name: "cloud_api_credentials_phone_number_id",
      unique: true
    });

    // The Cloud API only accepts free text within 24 hours of the
    // customer's last message.
    await queryInterface.addColumn("Tickets", "lastInboundAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "lastInboundAt");
    await queryInterface.dropTable("CloudApiCredentials");
  }
};
