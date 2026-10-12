import "server-only";
import { findOrderById } from "../orders/repository";
import { getStoreConfig } from "../store";
import { readSupabaseEnv } from "../supabase/env";
import { createServerClient } from "../supabase/server-client";
import { buildOrderEmailContext } from "./context";
import { sendQueuedEmails, type DispatchDeps, type DispatchSummary } from "./dispatch";
import { claimEmail, listSendableEmails, markEmailFailed, markEmailSent } from "./queue";
import { readEmailProvider } from "./resend";
import { renderOrderEmail } from "./templates";

const report = (message: string, error?: unknown): void => {
  console.error(`[emails] ${message}`, error ?? "");
};

// Sends the emails waiting for one order (right after its status changed), or for the whole store
// when no order is given (a retry sweep). Safe to call as often as you like: each email is claimed
// before it is sent.
export const sendOrderEmails = async (orderId?: string): Promise<DispatchSummary> => {
  const [config, client] = await Promise.all([getStoreConfig(), createServerClient()]);
  const supabase = readSupabaseEnv();

  const deps: DispatchDeps = {
    provider: readEmailProvider(),
    from: { name: config.email.fromName, address: config.email.fromAddress },
    replyTo: config.email.replyTo,
    listSendable: (id) => listSendableEmails(client, id),
    claim: (email) => claimEmail(client, email),
    render: async (email) => {
      const details = await findOrderById(client, email.orderId);
      if (!details) {
        throw new Error(`order ${email.orderId} not found`);
      }
      const context = await buildOrderEmailContext(details, config, supabase);
      return renderOrderEmail(email.kind, context);
    },
    markSent: (email, providerId) => markEmailSent(client, email, providerId),
    markFailed: (email, message, exhaust) => markEmailFailed(client, email, message, exhaust),
    report,
  };
  return sendQueuedEmails(deps, orderId);
};
