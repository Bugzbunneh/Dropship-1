import { after } from "next/server";
import { createWebhookDeps } from "@/lib/stripe/webhook-deps";
import { handleWebhookRequest } from "@/lib/stripe/webhook-handler";

// Stripe calls this when a checkout finishes or expires. The work is in handleWebhookRequest: check
// the signature, apply the event to its order in one idempotent database transaction, then (after
// answering) send any emails waiting for that order.
export const POST = async (request: Request): Promise<Response> => {
  let deps;
  try {
    deps = await createWebhookDeps((task) => after(task));
  } catch (error) {
    console.error("[stripe webhook] not configured", error);
    return Response.json({ error: "webhooks are not configured" }, { status: 503 });
  }
  return handleWebhookRequest(request, deps);
};
