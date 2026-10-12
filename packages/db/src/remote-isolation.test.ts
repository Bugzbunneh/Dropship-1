import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSeedSql, ids } from "./testing";
import { createLinkedProjectClient } from "./testing/linked-project";

// Behavioural isolation checks on the LIVE Supabase project, using its real auth.jwt(), auth.uid()
// and API roles (the local tests use a stand-in for those). Run with `pnpm db:check-remote`.
//
// Safe by construction: everything happens inside ONE statement that seeds two throwaway stores,
// runs each scenario in its own sub-block (rolled back by an exception), and finally raises an
// exception of its own, so nothing is ever committed. All results come back in that last error
// message, which keeps this to a single call to the database.

const client = createLinkedProjectClient();

afterAll(() => {
  client.close();
});

const throwawaySlugs = { storeA: "zz-isolation-a", storeB: "zz-isolation-b" };

type Actor = { role: "anon" | "authenticated"; claims: Record<string, string> };

const storefrontOf = (storeId: string): Actor => ({
  role: "anon",
  claims: { role: "anon", store_id: storeId },
});

const operator = (userId: string): Actor => ({
  role: "authenticated",
  claims: { role: "authenticated", sub: userId },
});

const anonymous: Actor = { role: "anon", claims: { role: "anon" } };

// An action is PL/pgSQL that either sets `result` or hits a database error.
type Scenario = { name: string; actor: Actor; action: string };

const listColumn = (table: string, column: string): string =>
  `select coalesce(string_agg(${column}, ',' order by ${column}), '') into result from public.${table};`;

const insertProduct = (storeId: string): string =>
  `insert into public.products (store_id, slug, title, department) values ('${storeId}', 'zz-new', 'New', 'dogs'); result := 'inserted';`;

const countUpdated = (productId: string): string => `
  with changed as (
    update public.products set title = 'Changed' where id = '${productId}' returning 1
  )
  select count(*)::text into result from changed;`;

const readScenarios: (Scenario & { expected: string })[] = [
  {
    name: "storefront A sees only active products of store A",
    actor: storefrontOf(ids.storeA),
    action: listColumn("products", "title"),
    expected: "Dog bed",
  },
  {
    name: "storefront A sees variants of active products only",
    actor: storefrontOf(ids.storeA),
    action: listColumn("variants", "title"),
    expected: "Medium",
  },
  {
    name: "storefront A sees only published collections",
    actor: storefrontOf(ids.storeA),
    action: listColumn("collections", "title"),
    expected: "Dogs",
  },
  {
    name: "storefront B sees only store B",
    actor: storefrontOf(ids.storeB),
    action: listColumn("products", "title"),
    expected: "Cat tree",
  },
  {
    name: "storefront A sees only its own store row",
    actor: storefrontOf(ids.storeA),
    action: listColumn("stores", "name"),
    expected: "Store A",
  },
  {
    name: "a request with no store claim sees nothing",
    actor: anonymous,
    action: listColumn("products", "title"),
    expected: "",
  },
  {
    name: "an operator of A sees A's drafts and nothing of B",
    actor: operator(ids.ownerA),
    action: listColumn("products", "title"),
    expected: "Dog bed,Dog coat",
  },
  {
    name: "a read-only operator of A sees A's drafts too",
    actor: operator(ids.viewerA),
    action: listColumn("products", "title"),
    expected: "Dog bed,Dog coat",
  },
  {
    name: "an operator of B sees only store B",
    actor: operator(ids.ownerB),
    action: listColumn("products", "title"),
    expected: "Cat bowl,Cat tree",
  },
  {
    name: "a user sees only their own memberships",
    actor: operator(ids.ownerA),
    action: listColumn("operators", "role"),
    expected: "owner",
  },
  {
    name: "a user with no role sees no products",
    actor: operator(ids.nobody),
    action: listColumn("products", "title"),
    expected: "",
  },
  {
    name: "an operator's update aimed at another store changes nothing",
    actor: operator(ids.ownerA),
    action: countUpdated(ids.productActiveB),
    expected: "0",
  },
  {
    name: "an operator can still update their own store",
    actor: operator(ids.ownerA),
    action: countUpdated(ids.productActiveA),
    expected: "1",
  },
];

const deniedScenarios: (Scenario & { expectedError: string })[] = [
  {
    name: "an operator cannot insert into another store",
    actor: operator(ids.ownerA),
    action: insertProduct(ids.storeB),
    expectedError: "row-level security",
  },
  {
    name: "a read-only operator cannot insert",
    actor: operator(ids.viewerA),
    action: insertProduct(ids.storeA),
    expectedError: "row-level security",
  },
  {
    name: "the storefront cannot write",
    actor: storefrontOf(ids.storeA),
    action: insertProduct(ids.storeA),
    expectedError: "permission denied",
  },
  {
    name: "a user cannot grant themselves access",
    actor: operator(ids.nobody),
    action: `insert into public.operators (user_id, store_id, role) values ('${ids.nobody}', '${ids.storeA}', 'owner'); result := 'inserted';`,
    expectedError: "permission denied",
  },
];

const allScenarios: Scenario[] = [...readScenarios, ...deniedScenarios];

// Each scenario runs in a sub-block. Whether it finishes or fails, its exception handler records
// the message and Postgres rolls the sub-block back, including the role switch.
const scenarioBlock = (scenario: Scenario, index: number): string => `
  begin
    result := null;
    set local role ${scenario.actor.role};
    perform set_config('request.jwt.claims', '${JSON.stringify(scenario.actor.claims)}', true);
    ${scenario.action}
    raise exception 'RESULT:%', result;
  exception when others then
    outcomes := outcomes || '#${index}|' || sqlerrm || '|~|';
  end;
`;

const allScenariosSql = (): string => `
do $$
declare
  result text;
  outcomes text := '';
begin
${buildSeedSql(throwawaySlugs)}
${allScenarios.map(scenarioBlock).join("\n")}
  raise exception 'SCENARIOS:%', outcomes;
end
$$;
`;

// Pulls "#index|message|~|" records out of the CLI's error output.
const parseOutcomes = (output: string): Map<number, string> => {
  const outcomes = new Map<number, string>();
  for (const match of output.matchAll(/#(\d+)\|(.*?)\|~\|/gs)) {
    outcomes.set(Number(match[1]), match[2] ?? "");
  }
  return outcomes;
};

let outcomes: Map<number, string>;

beforeAll(() => {
  const run = client.runSql(allScenariosSql());
  outcomes = parseOutcomes(`${run.stdout}\n${run.stderr}`);

  if (outcomes.size !== allScenarios.length) {
    const preview = `${run.stdout}${run.stderr}`.slice(0, 800);
    throw new Error(
      `Expected ${allScenarios.length} scenario results, got ${outcomes.size}: ${preview}`,
    );
  }
}, 300_000);

const outcomeOf = (scenario: Scenario): string =>
  outcomes.get(allScenarios.indexOf(scenario)) ?? "";

describe("reads and updates on the live project", () => {
  it.each(readScenarios)("$name", (scenario) => {
    expect(outcomeOf(scenario)).toBe(`RESULT:${scenario.expected}`);
  });
});

describe("denied writes on the live project", () => {
  it.each(deniedScenarios)("$name", (scenario) => {
    const outcome = outcomeOf(scenario);

    expect(outcome).toContain(scenario.expectedError);
    expect(outcome).not.toContain("RESULT:inserted");
  });
});

describe("cleanup", () => {
  it("leaves nothing behind on the live project", async () => {
    const rows = await client.queryRows(
      "select count(*)::int as leftover from public.stores where slug like 'zz-isolation-%'",
    );

    expect(rows).toEqual([{ leftover: 0 }]);
  });
});
