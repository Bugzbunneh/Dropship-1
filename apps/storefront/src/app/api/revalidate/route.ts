import { expireTags } from "@/lib/revalidation";
import { isAuthorised } from "@/lib/secret";
import { parseTagList } from "@/lib/tags";

const json = (body: Record<string, unknown>, status: number): Response =>
  Response.json(body, { status });

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

// Called by sync jobs and webhooks: POST { "tags": ["product:123"] } with the x-revalidate-secret
// header. Fails closed when no secret is configured.
export const POST = async (request: Request): Promise<Response> => {
  const expectedSecret = process.env["REVALIDATE_SECRET"];
  if (!expectedSecret) {
    return json({ error: "revalidation is not configured" }, 503);
  }

  const providedSecret = request.headers.get("x-revalidate-secret");
  if (!isAuthorised(providedSecret, expectedSecret)) {
    return json({ error: "unauthorised" }, 401);
  }

  const parsed = parseTagList(await readJson(request));
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  expireTags(parsed.tags);
  return json({ revalidated: parsed.tags }, 200);
};
