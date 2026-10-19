import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Campaigns", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: { type: DataTypes.STRING(80), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      // JSON list of tag ids; empty = every contact of the company.
      tagIds: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "draft"
      },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      minDelaySeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      maxDelaySeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      windowStart: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: "08:00"
      },
      windowEnd: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: "20:00"
      },
      includeOptOut: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastError: { type: DataTypes.STRING, allowNull: true },
      // Each start or resume gets a new token; a queued step with an old
      // token stops, so two sending chains never run for one campaign.
      dispatchToken: { type: DataTypes.STRING(36), allowNull: true },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
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

    await queryInterface.createTable("CampaignContacts", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Campaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      // Copied when the audience is built, so the report survives a deleted
      // contact.
      name: { type: DataTypes.STRING, allowNull: false },
      number: { type: DataTypes.STRING, allowNull: false },
      // pending, sent, failed or skipped
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "pending"
      },
      error: { type: DataTypes.STRING, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex(
      "CampaignContacts",
      ["campaignId", "status"],
      {
        name: "campaign_contacts_campaign_status"
      }
    );

    // Contacts who answered SAIR stop receiving campaigns.
    await queryInterface.addColumn("Contacts", "optOutAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Plans", "campaignsEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.bulkUpdate(
      "Plans",
      { campaignsEnabled: true },
      { id: 1 }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "campaignsEnabled");
    await queryInterface.removeColumn("Contacts", "optOutAt");
    await queryInterface.dropTable("CampaignContacts");
    await queryInterface.dropTable("Campaigns");
  }
};
