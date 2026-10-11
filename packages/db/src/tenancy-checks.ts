// Structural checks that every table in the public schema keeps to the tenancy rules.
//
// Written against a plain "run this SQL, give me rows" function so the same checks run on the
// embedded test database today and on a real Supabase database in CI later.

export type QueryRows = (sql: string) => Promise<Record<string, unknown>[]>;

const TABLES_WITHOUT_STORE_ID = ["stores"];

const asNames = (rows: Record<string, unknown>[], column: string): string[] =>
  rows.map((row) => String(row[column]));

const tablesWithoutRls = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
    order by c.relname
  `);
  return asNames(rows, "name");
};

const storeOwnedTables = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by c.relname
  `);
  const allTables = asNames(rows, "name");
  return allTables.filter((name) => !TABLES_WITHOUT_STORE_ID.includes(name));
};

const tablesMissingNotNullStoreId = async (query: QueryRows, tables: string[]) => {
  const rows = await query(`
    select table_name as name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'store_id' and is_nullable = 'NO'
  `);
  const withStoreId = new Set(asNames(rows, "name"));
  return tables.filter((table) => !withStoreId.has(table));
};

const tablesMissingStoreForeignKey = async (query: QueryRows, tables: string[]) => {
  const rows = await query(`
    select c.conrelid::regclass::text as name
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'public.stores'::regclass
      and array_length(c.conkey, 1) = 1
      and a.attname = 'store_id'
  `);
  const withForeignKey = new Set(asNames(rows, "name").map((name) => name.replace("public.", "")));
  return tables.filter((table) => !withForeignKey.has(table));
};

const tablesWithAnonymousWrites = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and (
        has_table_privilege('anon', c.oid, 'INSERT')
        or has_table_privilege('anon', c.oid, 'UPDATE')
        or has_table_privilege('anon', c.oid, 'DELETE')
        or has_table_privilege('anon', c.oid, 'TRUNCATE')
      )
    order by c.relname
  `);
  return asNames(rows, "name");
};

const tablesGrantedToEveryone = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select distinct c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) acl
    where n.nspname = 'public' and c.relkind in ('r', 'p') and acl.grantee = 0
    order by c.relname
  `);
  return asNames(rows, "name");
};

const securityDefinerFunctionsInPublic = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select p.proname as name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
    order by p.proname
  `);
  return asNames(rows, "name");
};

// Functions in our schemas must pin search_path, otherwise a caller can change what the function
// resolves names to (Supabase advisor 0011).
const functionsWithMutableSearchPath = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select p.proname as name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('app', 'public')
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where setting like 'search_path=%'
      )
    order by p.proname
  `);
  return asNames(rows, "name");
};

// Two permissive policies for the same role and command are all evaluated for every row, so they
// should be merged into one (Supabase advisor 0006). Returns "table (role, command)" labels.
const overlappingPermissivePolicies = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select tablename || ' (' || role || ', ' || cmd || ')' as name
    from (
      select tablename, cmd, unnest(roles)::text as role
      from pg_policies
      where schemaname = 'public' and permissive = 'PERMISSIVE'
    ) expanded
    group by tablename, cmd, role
    having count(*) > 1
    order by 1
  `);
  return asNames(rows, "name");
};

// A foreign key needs an index that starts with its columns, or deletes and joins on the parent
// scan the whole child table (Supabase advisor 0001). Returns "table.constraint" labels.
const foreignKeysWithoutIndex = async (query: QueryRows): Promise<string[]> => {
  const rows = await query(`
    select c.conrelid::regclass::text || '.' || c.conname as name
    from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] = c.conkey
      )
    order by 1
  `);
  return asNames(rows, "name");
};

const describeAll = (names: string[], message: (name: string) => string): string[] =>
  names.map(message);

// Returns one human-readable line per violation. An empty list means the schema is clean.
export const findTenancyViolations = async (query: QueryRows): Promise<string[]> => {
  const tables = await storeOwnedTables(query);

  const [noRls, noStoreId, noStoreFk, anonWrites, everyone, definers, mutable, overlap, noIndex] =
    await Promise.all([
      tablesWithoutRls(query),
      tablesMissingNotNullStoreId(query, tables),
      tablesMissingStoreForeignKey(query, tables),
      tablesWithAnonymousWrites(query),
      tablesGrantedToEveryone(query),
      securityDefinerFunctionsInPublic(query),
      functionsWithMutableSearchPath(query),
      overlappingPermissivePolicies(query),
      foreignKeysWithoutIndex(query),
    ]);

  return [
    ...describeAll(noRls, (name) => `${name}: row-level security is not enabled`),
    ...describeAll(noStoreId, (name) => `${name}: has no NOT NULL store_id column`),
    ...describeAll(noStoreFk, (name) => `${name}: store_id does not reference stores(id)`),
    ...describeAll(anonWrites, (name) => `${name}: the anon role can write to it`),
    ...describeAll(everyone, (name) => `${name}: privileges are granted to PUBLIC`),
    ...describeAll(
      definers,
      (name) => `function ${name}: security definer functions must not live in public`,
    ),
    ...describeAll(mutable, (name) => `function ${name}: search_path is not pinned`),
    ...describeAll(overlap, (name) => `${name}: more than one permissive policy, merge them`),
    ...describeAll(noIndex, (name) => `${name}: foreign key has no covering index`),
  ];
};

// Names of the tables that carry a store_id, for tests that loop over every one of them.
export const listStoreOwnedTables = storeOwnedTables;
