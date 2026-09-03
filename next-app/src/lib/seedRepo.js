/**
 * PostgreSQL-backed sample-data entry point used by the admin seed API.
 *
 * The command-line script owns the complete seed definition so the API and
 * `pnpm db:seed:sample` cannot drift into separate SQLite/PostgreSQL paths.
 */
import { seed as seedPostgresSampleData } from "../../scripts/populate-sample-data.mjs";

export async function populateSampleData({ force = false } = {}) {
  const summary = await seedPostgresSampleData({ force });

  return {
    ok: true,
    summary: {
      ...summary,
      registrarSeeded: true,
      osasSeeded: true,
    },
  };
}
