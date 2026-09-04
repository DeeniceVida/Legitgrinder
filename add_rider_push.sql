-- Push notification subscriptions for riders.
--
-- One row per PHONE, not per rider: a rider may install the app on a work
-- phone and a personal one, and both should buzz. endpoint is the natural
-- key — the push service hands out a unique URL per installation.
--
-- NOTE on search_path: pgcrypto lives in the `extensions` schema on Supabase,
-- not `public`. Every function below therefore sets
--     set search_path = public, extensions
-- so crypt() resolves. Leaving `extensions` off makes the PIN check raise
-- "function crypt(text, text) does not exist", which reads to a rider as
-- "wrong PIN" forever. This bit us once already on add_rider_pin.sql.

create table if not exists public.rider_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  rider_id     uuid not null references public.riders(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  -- NOT named `auth`. `auth` is also a SCHEMA on Supabase, and the admin
  -- policy below calls auth.uid() on this very table — where the table's own
  -- columns are in scope, so the name is ambiguous. That collision failed the
  -- whole script, and because the editor runs it as one transaction it rolled
  -- back silently: no table, no functions, no obvious error.
  auth_secret  text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists rider_push_rider_idx
  on public.rider_push_subscriptions(rider_id);

alter table public.rider_push_subscriptions enable row level security;

-- Riders never touch this table directly; they go through the RPCs below,
-- which authenticate them by access token + PIN. Only an admin reads it,
-- because the admin's browser is what dispatches the notification.
drop policy if exists "admin manages rider push" on public.rider_push_subscriptions;
create policy "admin manages rider push" on public.rider_push_subscriptions
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- ------------------------------------------------------------------
-- Rider turns alerts ON for the phone they are holding.
-- ------------------------------------------------------------------
create or replace function public.rider_save_push(
  p_token    text,
  p_pin      text,
  p_endpoint text,
  p_p256dh   text,
  p_auth     text,
  p_ua       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider public.riders%rowtype;
begin
  select * into v_rider from public.riders
   where access_token = p_token and active limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  if v_rider.pin_hash is not null then
    if p_pin is null or v_rider.pin_hash <> crypt(p_pin, v_rider.pin_hash) then
      return jsonb_build_object('ok', false, 'needsPin', true, 'error', 'Please sign in again.');
    end if;
  end if;

  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'That phone did not return a valid subscription.');
  end if;

  -- Re-subscribing on the same phone must not create a second row, and if the
  -- phone previously belonged to another rider the row moves across.
  insert into public.rider_push_subscriptions (rider_id, endpoint, p256dh, auth_secret, user_agent)
  values (v_rider.id, p_endpoint, p_p256dh, p_auth, p_ua)
  on conflict (endpoint) do update
    set rider_id    = excluded.rider_id,
        p256dh      = excluded.p256dh,
        auth_secret = excluded.auth_secret,
        user_agent  = excluded.user_agent;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rider_save_push(text, text, text, text, text, text) to anon, authenticated;


-- ------------------------------------------------------------------
-- Rider turns alerts OFF for this phone.
-- ------------------------------------------------------------------
create or replace function public.rider_delete_push(
  p_token    text,
  p_pin      text,
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider public.riders%rowtype;
begin
  select * into v_rider from public.riders
   where access_token = p_token and active limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  if v_rider.pin_hash is not null then
    if p_pin is null or v_rider.pin_hash <> crypt(p_pin, v_rider.pin_hash) then
      return jsonb_build_object('ok', false, 'needsPin', true, 'error', 'Please sign in again.');
    end if;
  end if;

  delete from public.rider_push_subscriptions
   where endpoint = p_endpoint and rider_id = v_rider.id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rider_delete_push(text, text, text) to anon, authenticated;


-- ------------------------------------------------------------------
-- Is THIS phone already registered? Lets the toggle show the truth on
-- load instead of guessing from localStorage, which lies after a
-- reinstall or a cleared site data.
-- ------------------------------------------------------------------
create or replace function public.rider_push_status(
  p_token    text,
  p_pin      text,
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rider public.riders%rowtype;
  v_on    boolean;
begin
  select * into v_rider from public.riders
   where access_token = p_token and active limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This link is no longer active.');
  end if;

  if v_rider.pin_hash is not null then
    if p_pin is null or v_rider.pin_hash <> crypt(p_pin, v_rider.pin_hash) then
      return jsonb_build_object('ok', false, 'needsPin', true);
    end if;
  end if;

  select exists (
    select 1 from public.rider_push_subscriptions
     where endpoint = p_endpoint and rider_id = v_rider.id
  ) into v_on;

  return jsonb_build_object('ok', true, 'enabled', v_on);
end;
$$;

grant execute on function public.rider_push_status(text, text, text) to anon, authenticated;


-- ------------------------------------------------------------------
-- Ran clean? This prints the answer instead of finishing in silence.
-- Want: table_exists = true, functions_found = 3.
-- ------------------------------------------------------------------
select
  to_regclass('public.rider_push_subscriptions') is not null as table_exists,
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('rider_save_push', 'rider_delete_push', 'rider_push_status')
  ) as functions_found;
