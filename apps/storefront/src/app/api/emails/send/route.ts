import { catalogSource } from "@/lib/catalog";
import { sendOrderEmails } from "@/lib/emails/send";
import { isAuthorised } from "@/lib/secret";

const json = (body: Record<string, unknown>, status: number): Response =>
  Response.json(body, { status });

// Sends every order email that is waiting: shipped and delivered notices (queued by the database
// when an order moves on), and any that failed earlier and have attempts left. Called by whatever
// moves orders along (a fulfilment job, an operator's script) and by a scheduled retry.
//
// It takes the same x-revalidate-secret as /api/revalidate: one internal secret per deployment,
// for the jobs that run beside the site. Sending is safe to repeat: each email is claimed first.
export const POST = async (request: Request): Promise<Response> => {
  const expectedSecret = process.env["REVALIDATE_SECRET"];
  if (!expectedSecret) {
    return json({ error: "not configured" }, 503);
  }
  if (!isAuthorised(request.headers.get("x-revalidate-secret"), expectedSecret)) {
    return json({ error: "unauthorised" }, 401);
  }

  // the offline demo catalog has no database, so there is nothing queued
  if (catalogSource() === "fixtures") {
    return json({ sent: 0, failed: 0, skipped: 0, note: "demo catalog: no orders" }, 200);
  }

  try {
    return json({ ...(await sendOrderEmails()) }, 200);
  } catch (error) {
    console.error("[emails] sweep failed", error);
    return json({ error: "sweep failed" }, 500);
  }
};
