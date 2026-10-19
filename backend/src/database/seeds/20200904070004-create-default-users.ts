import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const email = process.env.ADMIN_EMAIL || "admin@cerqueiralabs.com";
    let password = process.env.ADMIN_PASSWORD;

    if (!password) {
      password = randomBytes(12).toString("base64url");
      // Printed once so the operator can log in for the first time.
      // eslint-disable-next-line no-console
      console.log(
        `\n[seed] Admin user created: ${email}\n[seed] Generated password: ${password}\n[seed] Change it after the first login.\n`
      );
    }

    return queryInterface.bulkInsert(
      "Users",
      [
        {
          name: "Administrador",
          email,
          passwordHash: await hash(password, 8),
          profile: "admin",
          tokenVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {});
  }
};
