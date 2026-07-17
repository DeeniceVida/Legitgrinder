-- Deadline for group-buy campaigns. Run once in the Supabase SQL editor.
-- When closes_at passes (or status is 'closed'), the public page stops taking payments.
alter table public.group_campaigns
  add column if not exists closes_at timestamptz;
