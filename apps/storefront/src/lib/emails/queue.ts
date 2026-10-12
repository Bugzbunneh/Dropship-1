import "server-only";
import { isEmailKind } from "@dropship/core";
import type { ServerClient } from "../supabase/server-client";
import { MAX_EMAIL_ATTEMPTS, type QueuedEmail } from "./dispatch";

// The email queue, as rows in the email_events table (filled by the order status trigger).

// A send that has been "sending" this long was interrupted, and can be taken over.
export const STUCK_AFTER_MS = 10 * 60 * 1000;

const PAGE_SIZE = 20;

type EmailRow = {
  id: string;
  order_id: string;
  kind: string;
  to_address: string;
  status: string;
  attempts: number;
};

const fromRow = (row: EmailRow): QueuedEmail | undefined =>
  isEmailKind(row.kind)
    ? {
        id: row.id,
        orderId: row.order_id,
        kind: row.kind,
        toAddress: row.to_address,
        attempts: row.attempts,
      }
    : undefined;

// What is ready to send: new emails, failed ones with attempts left, and ones stuck mid-send.
export const listSendableEmails = async (
  client: ServerClient,
  orderId: string | undefined,
  now: Date = new Date(),
): Promise<QueuedEmail[]> => {
  const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MS).toISOString();
  const sendable = [
    `and(status.in.(queued,failed),attempts.lt.${MAX_EMAIL_ATTEMPTS})`,
    `and(status.eq.sending,claimed_at.lt.${stuckBefore})`,
  ].join(",");

  let query = client
    .from("email_events")
    .select("id, order_id, kind, to_address, status, attempts")
    .or(sendable)
    .order("created_at")
    .limit(PAGE_SIZE);
  if (orderId) {
    query = query.eq("order_id", orderId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not read the email queue: ${error.message}`);
  }
  return (data as EmailRow[]).flatMap((row) => {
    const email = fromRow(row);
    return email ? [email] : [];
  });
};

// Takes ownership of an email. The update only matches if the row is still as we read it, so when
// two callers race exactly one of them gets a row back.
export const claimEmail = async (
  client: ServerClient,
  email: QueuedEmail,
  now: Date = new Date(),
): Promise<boolean> => {
  const { data, error } = await client
    .from("email_events")
    .update({
      status: "sending",
      attempts: email.attempts + 1,
      claimed_at: now.toISOString(),
    })
    .eq("id", email.id)
    .eq("attempts", email.attempts)
    .neq("status", "sent")
    .select("id");
  if (error) {
    throw new Error(`Could not claim email ${email.id}: ${error.message}`);
  }
  return data.length === 1;
};

export const markEmailSent = async (
  client: ServerClient,
  email: QueuedEmail,
  providerMessageId: string,
  now: Date = new Date(),
): Promise<void> => {
  const { error } = await client
    .from("email_events")
    .update({
      status: "sent",
      provider_message_id: providerMessageId,
      sent_at: now.toISOString(),
      last_error: null,
    })
    .eq("id", email.id);
  if (error) {
    throw new Error(`Could not record that email ${email.id} was sent: ${error.message}`);
  }
};

export const markEmailFailed = async (
  client: ServerClient,
  email: QueuedEmail,
  message: string,
  exhaust: boolean,
): Promise<void> => {
  const { error } = await client
    .from("email_events")
    .update({
      status: "failed",
      last_error: message,
      ...(exhaust ? { attempts: MAX_EMAIL_ATTEMPTS } : {}),
    })
    .eq("id", email.id);
  if (error) {
    throw new Error(`Could not record the failure of email ${email.id}: ${error.message}`);
  }
};
