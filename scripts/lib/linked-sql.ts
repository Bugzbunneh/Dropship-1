import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Runs SQL against the Supabase project this repo is linked to, through the CLI (already logged
// in; see docs/migrations.md). Returns the CLI's JSON output. Throws with the output on failure.
export const runLinkedSql = (sql: string): string => {
  const scratchDirectory = mkdtempSync(path.join(tmpdir(), "dropship-script-"));
  try {
    const sqlFile = path.join(scratchDirectory, "script.sql");
    writeFileSync(sqlFile, sql);
    const command = `pnpm exec supabase db query --linked --file "${sqlFile}"`;
    const result = spawnSync(command, { encoding: "utf8", shell: true });
    if (result.status !== 0) {
      throw new Error(`Supabase query failed: ${result.stdout}${result.stderr}`);
    }
    return result.stdout;
  } finally {
    rmSync(scratchDirectory, { recursive: true, force: true });
  }
};
