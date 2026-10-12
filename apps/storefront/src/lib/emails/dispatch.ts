import type { EmailKind } from "@dropship/core";
import { EmailSendError, type EmailProvider, type OutgoingEmail } from "./provider";
import type { RenderedEmail } from "./templates";

// Sends the emails waiting in the queue. The queue itself is a database table that the order
// status trigger fills, so an email can't be forgotten; this is the part that actually sends.
//
// Each email is first *claimed* (marked "sending" only if nobody else already has), so two webhook
// deliveries or a retry running at once can't send it twice. A failure leaves it to be tried again,
// up to MAX_EMAIL_ATTEMPTS times.

export const MAX_EMAIL_ATTEMPTS = 5;

export type QueuedEmail = {
  id: string;
  orderId: string;
  kind: EmailKind;
  toAddress: string;
  attempts: number;
};

export type DispatchDeps = {
  provider: EmailProvider | undefined;
  from: OutgoingEmail["from"];
  replyTo: string | undefined;
  // emails ready to send now (queued, failed with attempts left, or stuck while sending)
  listSendable: (orderId: string | undefined) => Promise<QueuedEmail[]>;
  // true if this caller now owns the email
  claim: (email: QueuedEmail) => Promise<boolean>;
  render: (email: QueuedEmail) => Promise<RenderedEmail>;
  markSent: (email: QueuedEmail, providerMessageId: string) => Promise<void>;
  // `exhaust` stops further attempts: used when the provider says this email can never be accepted
  markFailed: (email: QueuedEmail, message: string, exhaust: boolean) => Promise<void>;
  report: (message: string, error?: unknown) => void;
};

export type DispatchSummary = {
  sent: number;
  failed: number;
  // waiting because no email provider is configured, or because another caller got there first
  skipped: number;
};

const describe = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, 500);

const sendOne = async (deps: DispatchDeps, provider: EmailProvider, email: QueuedEmail) => {
  const rendered = await deps.render(email);
  return provider.send({
    to: email.toAddress,
    from: deps.from,
    ...(deps.replyTo ? { replyTo: deps.replyTo } : {}),
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: `email-${email.id}`,
  });
};

export const sendQueuedEmails = async (
  deps: DispatchDeps,
  orderId?: string,
): Promise<DispatchSummary> => {
  const waiting = await deps.listSendable(orderId);
  const summary: DispatchSummary = { sent: 0, failed: 0, skipped: 0 };

  const provider = deps.provider;
  if (!provider) {
    if (waiting.length > 0) {
      deps.report(
        `${waiting.length} email(s) are waiting: no email provider is configured (set RESEND_API_KEY)`,
      );
    }
    return { ...summary, skipped: waiting.length };
  }

  for (const email of waiting) {
    if (!(await deps.claim(email))) {
      summary.skipped += 1;
      continue;
    }
    try {
      const { id } = await sendOne(deps, provider, email);
      await deps.markSent(email, id);
      summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      const retryable = !(error instanceof EmailSendError) || error.retryable;
      deps.report(
        `email ${email.id} (${email.kind}) was not sent${retryable ? ", will retry" : ""}`,
        error,
      );
      // a refusal that can never succeed uses up the remaining attempts at once
      await deps.markFailed(email, describe(error), !retryable).catch((markError: unknown) => {
        deps.report(`could not record the failure of email ${email.id}`, markError);
      });
    }
  }
  return summary;
};
