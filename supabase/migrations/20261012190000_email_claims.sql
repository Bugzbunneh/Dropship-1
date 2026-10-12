-- Records when an email send was claimed, so a send that was interrupted (the server stopped
-- between "sending" and "sent") can be noticed and retried instead of waiting forever.

alter table public.email_events add column claimed_at timestamptz;

grant update (claimed_at) on table public.email_events to storefront_server;
