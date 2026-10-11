import { readProbe } from "@/lib/probe";
import { connection } from "next/server";

// Diagnostic for the revalidation round trip. Switched off unless ENABLE_PROBE=true, which is read
// per request (connection() keeps this out of the build-time prerender).
export const GET = async (): Promise<Response> => {
  await connection();
  if (process.env["ENABLE_PROBE"] !== "true") {
    return new Response("Not found", { status: 404 });
  }

  const generatedAt = await readProbe();
  return Response.json({ generatedAt });
};
