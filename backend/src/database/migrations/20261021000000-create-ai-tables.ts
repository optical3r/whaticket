import { QueryInterface, DataTypes } from "sequelize";

const companyReference = {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: { model: "Companies", key: "id" },
  onUpdate: "CASCADE",
  onDelete: "CASCADE"
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // AI requests (suggestions, summaries, assistant replies) per month.
    // 0 turns AI off for the plan.
    await queryInterface.addColumn("Plans", "aiMonthlyRequests", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    });

    // Set when the virtual assistant hands the conversation to the team.
    await queryInterface.addColumn("Tickets", "aiHandoffAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await queryInterface.addColumn("Tickets", "aiReplies", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.createTable("KnowledgeArticles", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: { type: DataTypes.STRING, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      companyId: companyReference,
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("AiUsages", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      feature: { type: DataTypes.STRING(32), allowNull: false },
      model: { type: DataTypes.STRING(64), allowNull: false },
      inputTokens: { type: DataTypes.INTEGER, allowNull: false },
      outputTokens: { type: DataTypes.INTEGER, allowNull: false },
      ticketId: { type: DataTypes.INTEGER, allowNull: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      companyId: companyReference,
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    // The monthly limit counts a company's requests since the 1st.
    await queryInterface.addIndex("AiUsages", ["companyId", "createdAt"], {
      name: "ai_usages_company_created"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("AiUsages");
    await queryInterface.dropTable("KnowledgeArticles");
    await queryInterface.removeColumn("Tickets", "aiReplies");
    await queryInterface.removeColumn("Tickets", "aiHandoffAt");
    await queryInterface.removeColumn("Plans", "aiMonthlyRequests");
  }
};
