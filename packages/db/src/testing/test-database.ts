import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import type { Transaction } from "@electric-sql/pglite";
import type { QueryRows } from "../tenancy-checks";
import { supabaseShimSql } from "./supabase-shim";

const migrationsDirectory = fileURLToPath(
  new URL("../../../../supabase/migrations/", import.meta.url),
);

const listMigrationFiles = (): string[] => {
  const names = readdirSync(migrationsDirectory);
  const sqlFiles = names.filter((name) => name.endsWith(".sql"));
  return sqlFiles.sort();
};

// An in-memory Postgres with the Supabase shim and every migration applied in order.
export const createTestDatabase = async (): Promise<PGlite> => {
  const db = new PGlite();
  await db.exec(supabaseShimSql);

  for (const fileName of listMigrationFiles()) {
    const sql = readFileSync(`${migrationsDirectory}${fileName}`, "utf8");
    await db.exec(sql);
  }
  return db;
};

// Plain SQL as the owner, for seeding and for the structural checks.
export const queryRowsOf =
  (db: PGlite): QueryRows =>
  async (sql) => {
    const result = await db.query<Record<string, unknown>>(sql);
    return result.rows;
  };

export type Session =
  | { role: "anon"; storeId?: string }
  | { role: "authenticated"; userId: string; storeId?: string }
  | { role: "service_role" };

const claimsFor = (session: Session): Record<string, string> => {
  if (session.role === "service_role") {
    return { role: "service_role" };
  }
  const storeClaim = session.storeId ? { store_id: session.storeId } : {};
  if (session.role === "authenticated") {
    return { role: "authenticated", sub: session.userId, ...storeClaim };
  }
  return { role: "anon", ...storeClaim };
};

class RollbackSignal extends Error {}

// Runs `work` the way PostgREST would: as the session's database role, with its JWT claims set.
// Everything is rolled back afterwards, so tests never see each other's writes.
export const runAs = async <T>(
  db: PGlite,
  session: Session,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> => {
  let outcome: { value: T } | undefined;

  try {
    await db.transaction(async (tx) => {
      const claimsJson = JSON.stringify(claimsFor(session));
      await tx.query("select set_config('request.jwt.claims', $1, true)", [claimsJson]);
      await tx.exec(`set local role ${session.role}`);
      outcome = { value: await work(tx) };
      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) {
      throw error;
    }
  }

  if (!outcome) {
    throw new Error("runAs finished without a result");
  }
  return outcome.value;
};

export const rowsAs = async (
  db: PGlite,
  session: Session,
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> => {
  const result = await runAs(db, session, (tx) => tx.query<Record<string, unknown>>(sql, params));
  return result.rows;
};
