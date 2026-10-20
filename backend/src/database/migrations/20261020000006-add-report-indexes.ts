import { QueryInterface } from "sequelize";

// Speeds up the first-response and period queries used by the reports.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addIndex(
      "Messages",
      ["ticketId", "fromMe", "createdAt"],
      {
        name: "Messages_ticketId_fromMe_createdAt"
      }
    );
    await queryInterface.addIndex("Tickets", ["companyId", "createdAt"], {
      name: "Tickets_companyId_createdAt"
    });
    await queryInterface.addIndex("Tickets", ["companyId", "closedAt"], {
      name: "Tickets_companyId_closedAt"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // MySQL may drop the automatic foreign key index once a composite index
    // covers companyId, so a plain one must exist before removing them.
    await queryInterface.addIndex("Tickets", ["companyId"], {
      name: "Tickets_companyId_idx"
    });
    await queryInterface.addIndex("Messages", ["ticketId"], {
      name: "Messages_ticketId_idx"
    });
    await queryInterface.removeIndex("Tickets", "Tickets_companyId_closedAt");
    await queryInterface.removeIndex("Tickets", "Tickets_companyId_createdAt");
    await queryInterface.removeIndex(
      "Messages",
      "Messages_ticketId_fromMe_createdAt"
    );
  }
};
