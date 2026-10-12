import { describe, expect, it, vi } from "vitest";
import { sendQueuedEmails, type DispatchDeps, type QueuedEmail } from "./dispatch";
import { EmailSendError, type EmailProvider } from "./provider";
import { createResendProvider, formatSender, readEmailProvider } from "./resend";

const email = (id: string, overrides: Partial<QueuedEmail> = {}): QueuedEmail => ({
  id,
  orderId: "order-1",
  kind: "order_confirmation",
  toAddress: "alex@example.com",
  attempts: 0,
  ...overrides,
});

const setup = (
  waiting: QueuedEmail[],
  provider: EmailProvider | undefined,
  overrides: Partial<DispatchDeps> = {},
) => {
  const mocks = {
    listSendable: vi.fn(async () => waiting),
    claim: vi.fn(async () => true),
    render: vi.fn(async () => ({ subject: "Subject", html: "<p>Hi</p>", text: "Hi" })),
    markSent: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined),
    report: vi.fn(),
  };
  const deps = {
    provider,
    from: { name: "Pilot Pets", address: "hello@pilotpets.example.com" },
    replyTo: "support@pilotpets.example.com",
    ...mocks,
    ...overrides,
  } as DispatchDeps;
  return { deps, mocks };
};

const workingProvider = (): EmailProvider & { send: ReturnType<typeof vi.fn> } => ({
  name: "test",
  send: vi.fn(async () => ({ id: "msg_1" })),
});

describe("sendQueuedEmails", () => {
  it("sends each waiting email once and records it", async () => {
    const provider = workingProvider();
    const { deps, mocks } = setup([email("e1"), email("e2")], provider);

    const summary = await sendQueuedEmails(deps);

    expect(summary).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(mocks.markSent).toHaveBeenCalledWith(email("e1"), "msg_1");
  });

  it("sends what the template produced, from the store, with a key that makes a resend harmless", async () => {
    const provider = workingProvider();
    const { deps } = setup([email("e1")], provider);

    await sendQueuedEmails(deps);

    expect(provider.send).toHaveBeenCalledWith({
      to: "alex@example.com",
      from: { name: "Pilot Pets", address: "hello@pilotpets.example.com" },
      replyTo: "support@pilotpets.example.com",
      subject: "Subject",
      html: "<p>Hi</p>",
      text: "Hi",
      idempotencyKey: "email-e1",
    });
  });

  it("leaves emails waiting, untouched, when no provider is configured", async () => {
    const { deps, mocks } = setup([email("e1")], undefined);

    const summary = await sendQueuedEmails(deps);

    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.report).toHaveBeenCalledWith(expect.stringContaining("RESEND_API_KEY"));
  });

  it("does not send an email that someone else has already claimed", async () => {
    const provider = workingProvider();
    const { deps } = setup([email("e1")], provider, { claim: vi.fn(async () => false) });

    const summary = await sendQueuedEmails(deps);

    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("records a failure and carries on with the next email", async () => {
    const provider: EmailProvider = {
      name: "flaky",
      send: vi
        .fn<EmailProvider["send"]>()
        .mockRejectedValueOnce(new EmailSendError("busy", true))
        .mockResolvedValueOnce({ id: "msg_2" }),
    };
    const { deps, mocks } = setup([email("e1"), email("e2")], provider);

    const summary = await sendQueuedEmails(deps);

    expect(summary).toEqual({ sent: 1, failed: 1, skipped: 0 });
    expect(mocks.markFailed).toHaveBeenCalledWith(email("e1"), "busy", false);
    expect(mocks.markSent).toHaveBeenCalledWith(email("e2"), "msg_2");
  });

  it("gives up for good on a refusal that will never be accepted", async () => {
    const provider: EmailProvider = {
      name: "strict",
      send: async () => {
        throw new EmailSendError("invalid address", false);
      },
    };
    const { deps, mocks } = setup([email("e1")], provider);

    await sendQueuedEmails(deps);

    expect(mocks.markFailed).toHaveBeenCalledWith(email("e1"), "invalid address", true);
  });

  it("treats an unexpected error as worth retrying", async () => {
    const provider: EmailProvider = {
      name: "odd",
      send: async () => {
        throw new Error("socket hang up");
      },
    };
    const { deps, mocks } = setup([email("e1")], provider);

    await sendQueuedEmails(deps);

    expect(mocks.markFailed).toHaveBeenCalledWith(email("e1"), "socket hang up", false);
  });

  it("survives a template that fails to render", async () => {
    const provider = workingProvider();
    const { deps, mocks } = setup([email("e1")], provider, {
      render: vi.fn(async () => {
        throw new Error("order not found");
      }),
    });

    const summary = await sendQueuedEmails(deps);

    expect(summary.failed).toBe(1);
    expect(provider.send).not.toHaveBeenCalled();
    expect(mocks.markFailed).toHaveBeenCalled();
  });

  it("asks only for one order's emails when told which", async () => {
    const { deps, mocks } = setup([], workingProvider());

    await sendQueuedEmails(deps, "order-9");

    expect(mocks.listSendable).toHaveBeenCalledWith("order-9");
  });
});

describe("the Resend provider", () => {
  const outgoing = {
    to: "alex@example.com",
    from: { name: "Pilot Pets", address: "hello@pilotpets.example.com" },
    replyTo: "support@pilotpets.example.com",
    subject: "Hello",
    html: "<p>Hi</p>",
    text: "Hi",
    idempotencyKey: "email-e1",
  };

  const respond = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it("posts the email with the key, and returns the message id", async () => {
    const fetchImpl = respond(200, { id: "re_123" });

    const result = await createResendProvider("re_key", fetchImpl).send(outgoing);

    expect(result).toEqual({ id: "re_123" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_key",
      "Idempotency-Key": "email-e1",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      from: '"Pilot Pets" <hello@pilotpets.example.com>',
      to: ["alex@example.com"],
      subject: "Hello",
      html: "<p>Hi</p>",
      text: "Hi",
      reply_to: "support@pilotpets.example.com",
    });
  });

  it.each([429, 500, 503])("calls a %s worth retrying", async (status) => {
    const provider = createResendProvider("k", respond(status, { message: "try later" }));

    await expect(provider.send(outgoing)).rejects.toMatchObject({ retryable: true });
  });

  it.each([400, 401, 403, 422])("calls a %s final", async (status) => {
    const provider = createResendProvider("k", respond(status, { message: "nope" }));

    await expect(provider.send(outgoing)).rejects.toMatchObject({ retryable: false });
  });

  it("includes Resend's own explanation in the error", async () => {
    const provider = createResendProvider("k", respond(403, { message: "domain not verified" }));

    await expect(provider.send(outgoing)).rejects.toThrow("domain not verified");
  });

  it("does not leak the API key into an error", async () => {
    const provider = createResendProvider("re_secret_key", respond(401, { message: "bad key" }));

    await expect(provider.send(outgoing)).rejects.not.toThrow(/re_secret_key/);
  });

  it("refuses a success with no message id", async () => {
    const provider = createResendProvider("k", respond(200, {}));

    await expect(provider.send(outgoing)).rejects.toThrow("no id");
  });

  it("is only created when a key is set", () => {
    expect(readEmailProvider({})).toBeUndefined();
    expect(readEmailProvider({ RESEND_API_KEY: "  " })).toBeUndefined();
    expect(readEmailProvider({ RESEND_API_KEY: "re_abc" })?.name).toBe("resend");
  });

  it("cannot be tricked into a second header through the store's name", () => {
    const sender = formatSender({
      name: 'Evil"\r\nBcc: x@y.z <',
      address: "hello@pilotpets.example.com",
    });

    expect(sender).not.toMatch(/[\r\n]/);
    expect(sender).toBe('"EvilBcc: x@y.z" <hello@pilotpets.example.com>');
  });
});
