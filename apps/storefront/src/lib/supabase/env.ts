// Everything the storefront needs to talk to its Supabase project, read from the environment.

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
  // Server only. Never import this module from a client component.
  jwtSigningKey: string;
  storeId: string;
};

type Environment = Record<string, string | undefined>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const variableNames = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  jwtSigningKey: "SUPABASE_JWT_SIGNING_KEY",
  storeId: "STORE_ID",
} as const;

const isPresent = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

// Throws one error that names every missing or malformed variable, so a misconfigured deployment
// is fixed in one pass rather than one variable per attempt.
export const readSupabaseEnv = (env: Environment = process.env): SupabaseEnv => {
  const problems: string[] = [];

  const read = (key: keyof typeof variableNames): string => {
    const name = variableNames[key];
    const value = env[name];
    if (!isPresent(value)) {
      problems.push(`${name} is not set`);
      return "";
    }
    return value.trim();
  };

  const url = read("url");
  const publishableKey = read("publishableKey");
  const jwtSigningKey = read("jwtSigningKey");
  const storeId = read("storeId");

  if (url && !url.startsWith("https://")) {
    problems.push(`${variableNames.url} must start with https://`);
  }
  if (storeId && !UUID_PATTERN.test(storeId)) {
    problems.push(`${variableNames.storeId} must be a UUID`);
  }
  if (jwtSigningKey && /\s/.test(jwtSigningKey)) {
    problems.push(
      `${variableNames.jwtSigningKey} contains whitespace: put comments on their own line, not after the value`,
    );
  }

  if (problems.length > 0) {
    throw new Error(`Supabase is not configured:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  return { url, publishableKey, jwtSigningKey, storeId };
};
