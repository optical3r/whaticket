import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Settings of the whole installation, set by the superadmin (the
    // OpenAI key that pays for transcriptions, encrypted).
    await queryInterface.createTable("PlatformSettings", {
      key: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    // The plan decides who gets voice notes transcribed, and how many
    // minutes a month the platform pays for. 0 = no monthly limit.
    await queryInterface.addColumn("Plans", "transcriptionEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn("Plans", "transcriptionMonthlyMinutes", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 600
    });
    await queryInterface.bulkUpdate(
      "Plans",
      { transcriptionEnabled: true },
      { id: 1 }
    );

    // pending, done or failed; null when the message is not transcribed.
    await queryInterface.addColumn("Messages", "transcription", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Messages", "transcriptionStatus", {
      type: DataTypes.STRING(16),
      allowNull: true
    });

    await queryInterface.createTable("TranscriptionUsages", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      messageId: { type: DataTypes.STRING, allowNull: true },
      model: { type: DataTypes.STRING, allowNull: false },
      seconds: { type: DataTypes.INTEGER, allowNull: false },
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
    await queryInterface.addIndex("TranscriptionUsages", [
      "companyId",
      "createdAt"
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("TranscriptionUsages");
    await queryInterface.removeColumn("Messages", "transcriptionStatus");
    await queryInterface.removeColumn("Messages", "transcription");
    await queryInterface.removeColumn("Plans", "transcriptionMonthlyMinutes");
    await queryInterface.removeColumn("Plans", "transcriptionEnabled");
    await queryInterface.dropTable("PlatformSettings");
  }
};
