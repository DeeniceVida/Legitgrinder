-- ============================================================================
--  Sent-email history — every message the site sends, visible in the dashboard.
--
--  Until now the only record of what had gone out was the Resend dashboard, a
--  separate login on a separate site. This keeps the same history where the
--  orders are, including the FAILURES — a bounced invoice is worth far more to
--  know about than a delivered one, and that is precisely what nobody ever saw.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

create table if not exists public.sent_emails (
  id           uuid primary key default gen_random_uuid(),
  -- 'invoice' | 'receipt' | 'restock' | 'corporate' | 'sale-alert' |
  -- 'order-status' | 'group-balance'
  kind         text not null,
  recipient    text not null,               -- comma-separated when a batch went out
  recipients   int  not null default 1,
  subject      text,
  status       text not null default 'sent', -- 'sent' | 'failed'
  error        text,                         -- why, when it failed
  reference    text,                         -- order number, product name, whatever identifies it
  created_at   timestamptz not null default now()
);

create index if not exists sent_emails_recent_idx on public.sent_emails (created_at desc);
create index if not exists sent_emails_status_idx on public.sent_emails (status, created_at desc);

alter table public.sent_emails enable row level security;

-- Some mail is triggered by anonymous visitors (a corporate enquiry, a paid
-- shop order), so the log has to accept inserts from them. Nothing can be read
-- back without the admin role, so one customer can never see another's email.
--
-- Note this makes the log forgeable in principle: a determined stranger could
-- POST a fabricated row. It is a record for your own eyes, not an audit trail —
-- Resend remains the authority on what actually left the building.
drop policy if exists "anyone logs a sent email" on public.sent_emails;
create policy "anyone logs a sent email" on public.sent_emails
  for insert with check (true);

drop policy if exists "admin reads sent emails" on public.sent_emails;
create policy "admin reads sent emails" on public.sent_emails
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
