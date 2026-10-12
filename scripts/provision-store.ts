// Creates (or updates) a store's row in the linked Supabase project and prints its id.
//
//   pnpm store:provision pet-pilot
//   pnpm store:provision pet-pilot --env-file apps/storefront/.env.local
//
// The store's name and currency come from stores/<slug>/store.config.ts, so the database and the
// config cannot drift. Safe to run again: it updates the existing row and keeps its id.
// This is the first piece of the Phase 6 create-store tool.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadStoreConfig, storeSlugs } from "@dropship/stores";
import { runLinkedSql } from "./lib/linked-sql";

const quoteLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const readArguments = (): { slug: string; envFile: string | undefined } => {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) {
    throw new Error(
      `Usage: store:provision <slug> [--env-file <path>]. Stores: ${storeSlugs.join(", ")}`,
    );
  }
  const envFlagIndex = rest.indexOf("--env-file");
  const envFile = envFlagIndex >= 0 ? rest[envFlagIndex + 1] : undefined;
  return { slug, envFile };
};

// Sets NAME=value in an env file, replacing an existing NAME line or appending one.
const upsertEnvLine = (filePath: string, name: string, value: string): void => {
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = existing.length > 0 ? existing.split(/\r?\n/) : [];
  const newLine = `${name}=${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));

  if (index >= 0) {
    lines[index] = newLine;
  } else {
    const withoutTrailingBlank = lines.at(-1) === "" ? lines.slice(0, -1) : lines;
    lines.length = 0;
    lines.push(...withoutTrailingBlank, newLine);
  }
  const content = lines.at(-1) === "" ? lines.join("\n") : `${lines.join("\n")}\n`;
  writeFileSync(filePath, content);
};

const main = async (): Promise<void> => {
  const { slug, envFile } = readArguments();
  const config = await loadStoreConfig(slug);

  const sql = `
    insert into public.stores (slug, name, currency)
    values (${quoteLiteral(config.slug)}, ${quoteLiteral(config.name)}, ${quoteLiteral(config.currency)})
    on conflict (slug) do update set name = excluded.name, currency = excluded.currency
    returning id::text as id;
  `;
  const output = runLinkedSql(sql);
  const parsed = JSON.parse(output) as { rows: { id: string }[] };
  const storeId = parsed.rows[0]?.id;
  if (!storeId) {
    throw new Error(`No store id came back: ${output.slice(0, 300)}`);
  }

  console.log(`Store "${config.slug}" is provisioned.`);
  console.log(`STORE_ID=${storeId}`);

  if (envFile) {
    upsertEnvLine(envFile, "STORE_ID", storeId);
    console.log(`Wrote STORE_ID to ${envFile}`);
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
