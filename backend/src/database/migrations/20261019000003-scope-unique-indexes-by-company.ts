import { QueryInterface } from "sequelize";

// Values that used to be unique across the whole system now only need to be
// unique inside each company (two companies can talk to the same number).
const scopedUniques: Array<{ table: string; column: string }> = [
  { table: "Contacts", column: "number" },
  { table: "Contacts", column: "lid" },
  { table: "Queues", column: "name" },
  { table: "Queues", column: "color" },
  { table: "Whatsapps", column: "name" }
];

interface IndexRow {
  Key_name: string;
  Column_name: string;
  Non_unique: number | string;
}

// Index names differ between installs (e.g. "number" and "number_2"), so the
// single-column unique indexes are looked up instead of hard-coded.
const singleColumnUniqueIndexes = async (
  queryInterface: QueryInterface,
  table: string,
  column: string
): Promise<string[]> => {
  const [rows] = (await queryInterface.sequelize.query(
    `SHOW INDEX FROM \`${table}\``
  )) as [IndexRow[], unknown];

  const columnsByIndex = new Map<string, string[]>();
  rows
    .filter(row => Number(row.Non_unique) === 0 && row.Key_name !== "PRIMARY")
    .forEach(row => {
      const columns = columnsByIndex.get(row.Key_name) || [];
      columns.push(row.Column_name);
      columnsByIndex.set(row.Key_name, columns);
    });

  return [...columnsByIndex.entries()]
    .filter(([, columns]) => columns.length === 1 && columns[0] === column)
    .map(([name]) => name);
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const { table, column } of scopedUniques) {
      // eslint-disable-next-line no-await-in-loop
      const indexes = await singleColumnUniqueIndexes(
        queryInterface,
        table,
        column
      );
      // eslint-disable-next-line no-restricted-syntax
      for (const index of indexes) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeIndex(table, index);
      }
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addIndex(table, ["companyId", column], {
        unique: true,
        name: `${table}_companyId_${column}_unique`
      });
    }

    // Settings were keyed by name only; now each company has its own.
    await queryInterface.sequelize.query(
      "ALTER TABLE `Settings` DROP PRIMARY KEY, ADD PRIMARY KEY (`key`, `companyId`)"
    );
  },

  down: async (queryInterface: QueryInterface) => {
    // The composite indexes also serve the companyId foreign keys, so a plain
    // index has to exist before they can be dropped.
    const tables = [...new Set(scopedUniques.map(({ table }) => table))];
    // eslint-disable-next-line no-restricted-syntax
    for (const table of tables) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addIndex(table, ["companyId"], {
        name: `${table}_companyId_idx`
      });
    }

    await queryInterface.sequelize.query(
      "ALTER TABLE `Settings` DROP PRIMARY KEY, ADD PRIMARY KEY (`key`)"
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const { table, column } of scopedUniques) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeIndex(
        table,
        `${table}_companyId_${column}_unique`
      );
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addIndex(table, [column], { unique: true });
    }
  }
};
