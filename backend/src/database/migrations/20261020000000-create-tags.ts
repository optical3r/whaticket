import { QueryInterface, DataTypes } from "sequelize";

const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false }
};

const companyId = {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: { model: "Companies", key: "id" },
  onUpdate: "CASCADE",
  onDelete: "CASCADE"
};

const joinTable = (owner: string, ownerTable: string) => ({
  [`${owner}Id`]: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: { model: ownerTable, key: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE"
  },
  tagId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: { model: "Tags", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE"
  },
  ...timestamps
});

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Tags", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: { type: DataTypes.STRING, allowNull: false },
      color: { type: DataTypes.STRING, allowNull: false },
      companyId,
      ...timestamps
    });
    await queryInterface.addIndex("Tags", ["companyId", "name"], {
      unique: true,
      name: "Tags_companyId_name_unique"
    });

    await queryInterface.createTable(
      "TicketTags",
      joinTable("ticket", "Tickets")
    );
    await queryInterface.createTable(
      "ContactTags",
      joinTable("contact", "Contacts")
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ContactTags");
    await queryInterface.dropTable("TicketTags");
    await queryInterface.dropTable("Tags");
  }
};
