import { EmailSendError, type EmailProvider, type OutgoingEmail } from "./provider";

// Sends through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). Plain
// fetch rather than their SDK: it is one request, and fewer dependencies is fewer things to update.
//
// The sending domain must be verified in Resend before real customers get email; until then Resend
// only delivers to the account owner's own address.

const ENDPOINT = "https://api.resend.com/emails";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

// "Pilot Pets" <hello@pilotpets.example.com>. Characters that could end the name early or start a
// new header are removed.
export const formatSender = (from: OutgoingEmail["from"]): string => {
  const name = from.name.replace(/["<>\r\n\\]/g, "").trim();
  return name ? `"${name}" <${from.address}>` : from.address;
};

const errorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" ? body.message : `status ${response.status}`;
  } catch {
    return `status ${response.status}`;
  }
};

export const createResendProvider = (
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): EmailProvider => ({
  name: "resend",
  send: async (email) => {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify({
        from: formatSender(email.from),
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      // 429 and 5xx are worth another try; a 4xx means this email will never be accepted as sent
      const retryable = response.status === 429 || response.status >= 500;
      throw new EmailSendError(
        `Resend refused the email: ${await errorMessage(response)}`,
        retryable,
      );
    }

    const body = (await response.json()) as { id?: unknown };
    if (typeof body.id !== "string") {
      throw new EmailSendError("Resend accepted the email but returned no id", false);
    }
    return { id: body.id };
  },
});

// The provider for this deployment, or undefined when no key is set. Emails then stay queued in the
// database and nothing is lost: they go out once a key is added.
export const readEmailProvider = (
  env: Record<string, string | undefined> = process.env,
): EmailProvider | undefined => {
  const apiKey = env["RESEND_API_KEY"]?.trim();
  return apiKey ? createResendProvider(apiKey) : undefined;
};
