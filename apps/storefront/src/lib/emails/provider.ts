// The one thing the rest of the app knows about sending email. Providers sit behind this so a
// change of service (Resend today) touches one file (README design principle 3).

export type OutgoingEmail = {
  to: string;
  from: { name: string; address: string };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  // Sending the same key twice must not deliver two emails. We use the email's own id.
  idempotencyKey: string;
};

export type EmailProvider = {
  name: string;
  send: (email: OutgoingEmail) => Promise<{ id: string }>;
};

export class EmailSendError extends Error {
  // true when trying again later could work (the service is busy or down)
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}
