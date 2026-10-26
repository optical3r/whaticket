import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Official API connections can go through Coexy (docs/coexy.md): the
    // company connects its number from a link, with no app of its own on
    // Meta. The number's ids arrive only after that, and there is no app
    // secret: Coexy signs the webhook with the platform's secret.
    await queryInterface.addColumn("CloudApiCredentials", "provider", {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "meta"
    });
    await queryInterface.addColumn("CloudApiCredentials", "coexyChannelId", {
      type: DataTypes.STRING(64),
      allowNull: true
    });
    await queryInterface.addIndex("CloudApiCredentials", ["coexyChannelId"], {
      name: "cloud_api_credentials_coexy_channel_id",
      unique: true
    });
    // pending, active, disconnected or suspended, as Coexy reports it.
    await queryInterface.addColumn("CloudApiCredentials", "coexyStatus", {
      type: DataTypes.STRING(16),
      allowNull: true
    });
    await queryInterface.addColumn("CloudApiCredentials", "connectUrl", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    // Business verification on Meta (JSON: status, attempts, url...).
    await queryInterface.addColumn("CloudApiCredentials", "verification", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.changeColumn("CloudApiCredentials", "phoneNumberId", {
      type: DataTypes.STRING(64),
      allowNull: true
    });
    await queryInterface.changeColumn("CloudApiCredentials", "wabaId", {
      type: DataTypes.STRING(64),
      allowNull: true
    });
    await queryInterface.changeColumn("CloudApiCredentials", "appSecret", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    // Each Coexy channel costs the platform a monthly fee, so the plan
    // says who gets it and how many. 0 = no limit.
    await queryInterface.addColumn("Plans", "coexyEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn("Plans", "coexyMaxChannels", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.bulkUpdate("Plans", { coexyEnabled: true }, { id: 1 });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "coexyMaxChannels");
    await queryInterface.removeColumn("Plans", "coexyEnabled");
    await queryInterface.bulkDelete(
      "CloudApiCredentials",
      { provider: "coexy" },
      {}
    );
    await queryInterface.changeColumn("CloudApiCredentials", "appSecret", {
      type: DataTypes.TEXT,
      allowNull: false
    });
    await queryInterface.changeColumn("CloudApiCredentials", "wabaId", {
      type: DataTypes.STRING(64),
      allowNull: false
    });
    await queryInterface.changeColumn("CloudApiCredentials", "phoneNumberId", {
      type: DataTypes.STRING(64),
      allowNull: false
    });
    await queryInterface.removeColumn("CloudApiCredentials", "verification");
    await queryInterface.removeColumn("CloudApiCredentials", "connectUrl");
    await queryInterface.removeColumn("CloudApiCredentials", "coexyStatus");
    await queryInterface.removeIndex(
      "CloudApiCredentials",
      "cloud_api_credentials_coexy_channel_id"
    );
    await queryInterface.removeColumn("CloudApiCredentials", "coexyChannelId");
    await queryInterface.removeColumn("CloudApiCredentials", "provider");
  }
};
