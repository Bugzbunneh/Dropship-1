import { afterAll, describe, expect, it } from "vitest";
import { findTenancyViolations, listStoreOwnedTables } from "./tenancy-checks";
import { createLinkedProjectClient } from "./testing/linked-project";

// Runs the same structural rules as the local tests against the LIVE linked Supabase project.
// Read-only: it only runs SELECT queries. Run it with `pnpm db:check-remote`.

const client = createLinkedProjectClient();

afterAll(() => {
  client.close();
});

describe("the linked Supabase project", () => {
  it("follows the tenancy rules", async () => {
    const violations = await findTenancyViolations(client.queryRows);

    expect(violations).toEqual([]);
  });

  it("has the tables we expect, so the check is not passing on an empty schema", async () => {
    const tables = await listStoreOwnedTables(client.queryRows);

    expect(tables).toEqual(
      expect.arrayContaining([
        "collections",
        "operators",
        "product_collections",
        "products",
        "variants",
      ]),
    );
  });

  it("has every local migration applied", async () => {
    const rows = await client.queryRows(
      "select version from supabase_migrations.schema_migrations order by version",
    );
    const remoteVersions = rows.map((row) => String(row["version"]));

    expect(remoteVersions).toEqual(expect.arrayContaining(["20261011150000", "20261011170000"]));
  });
});
