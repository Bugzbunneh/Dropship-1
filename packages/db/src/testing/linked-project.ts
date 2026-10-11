import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { QueryRows } from "../tenancy-checks";

// Runs SQL against the LIVE Supabase project this repo is linked to, through the Supabase CLI
// (which must already be logged in and linked: see docs/migrations.md). Used only by the
// `pnpm db:check-remote` tests, never by CI.

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const MAX_RETRIES = 2;

export type SqlOutcome = {
  succeeded: boolean;
  stdout: string;
  // The CLI's own progress messages and any SQL error text.
  stderr: string;
};

export type LinkedProjectClient = {
  runSql: (sql: string) => SqlOutcome;
  queryRows: QueryRows;
  close: () => void;
};

export const createLinkedProjectClient = (): LinkedProjectClient => {
  const scratchDirectory = mkdtempSync(path.join(tmpdir(), "dropship-linked-"));
  let queryCounter = 0;

  const runOnce = (sqlFile: string): SqlOutcome => {
    const command = `pnpm exec supabase db query --linked --file "${sqlFile}"`;
    const result = spawnSync(command, { cwd: repositoryRoot, encoding: "utf8", shell: true });
    return {
      succeeded: result.status === 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  };

  // The CLI signs in with a temporary database role, and Supabase's connection pooler very
  // occasionally rejects it for a moment. That says nothing about our SQL, so try again.
  const isTemporaryRoleHiccup = (outcome: SqlOutcome): boolean =>
    !outcome.succeeded && outcome.stdout.includes("DbConfigConnectTempRoleError");

  const runSql = (sql: string): SqlOutcome => {
    queryCounter += 1;
    const sqlFile = path.join(scratchDirectory, `query-${queryCounter}.sql`);
    writeFileSync(sqlFile, sql);

    let outcome = runOnce(sqlFile);
    for (let retry = 0; retry < MAX_RETRIES && isTemporaryRoleHiccup(outcome); retry += 1) {
      outcome = runOnce(sqlFile);
    }
    return outcome;
  };

  // Every CLI call costs several seconds, so queries asked for in the same tick (the structural
  // checks fire a dozen at once) are combined into one statement: a single row whose columns r0,
  // r1, ... each hold one query's rows as JSON.
  type PendingQuery = {
    sql: string;
    resolve: (rows: Record<string, unknown>[]) => void;
    reject: (error: Error) => void;
  };
  let pendingQueries: PendingQuery[] = [];

  const asRows = (value: unknown): Record<string, unknown>[] => {
    const rows = typeof value === "string" ? JSON.parse(value) : value;
    return rows as Record<string, unknown>[];
  };

  const flushPendingQueries = (): void => {
    const batch = pendingQueries;
    pendingQueries = [];

    const columns = batch.map(
      (query, index) =>
        `(select coalesce(json_agg(row_to_json(t)), '[]'::json) from (${query.sql}) t) as r${index}`,
    );
    const outcome = runSql(`select ${columns.join(", ")}`);

    if (!outcome.succeeded) {
      const failure = new Error(
        `Query against the linked project failed: ${outcome.stdout.slice(0, 500)}`,
      );
      batch.forEach((query) => query.reject(failure));
      return;
    }

    const parsed = JSON.parse(outcome.stdout) as { rows: Record<string, unknown>[] };
    const combinedRow = parsed.rows[0] ?? {};
    batch.forEach((query, index) => query.resolve(asRows(combinedRow[`r${index}`])));
  };

  const queryRows: QueryRows = (sql) =>
    new Promise((resolve, reject) => {
      pendingQueries.push({ sql, resolve, reject });
      if (pendingQueries.length === 1) {
        queueMicrotask(flushPendingQueries);
      }
    });

  const close = (): void => {
    rmSync(scratchDirectory, { recursive: true, force: true });
  };

  return { runSql, queryRows, close };
};
