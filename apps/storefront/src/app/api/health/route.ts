import { getStoreConfig } from "@/lib/store";
import { connection } from "next/server";

// Used by uptime checks and the CI smoke test to confirm the running server loaded its store
// config. connection() keeps it out of the build-time prerender, so each call really hits the server.
export const GET = async (): Promise<Response> => {
  await connection();
  const store = await getStoreConfig();

  return Response.json({ status: "ok", store: store.slug });
};
