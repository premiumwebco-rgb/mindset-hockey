-- ============================================================================
-- 0024 — Live Virtual Coaching
--
-- Adds four things, all additive — nothing here touches an existing table's
-- existing columns, existing pricing, or existing Stripe/webhook behavior:
--
--   1. member_coaching_content — admin/coach-uploaded workout & nutrition
--      resources scoped to one member. Backs the new Custom Workout
--      Programming and Custom Nutrition Coaching pages. Same ownership model
--      as assignments (migration 0017): staff write, member reads only their
--      own row, staff read everything.
--
--   2. group_coaching_sessions — admin/coach-created scheduled group
--      sessions (date/time, topic, description, price, optional capacity).
--
--   3. group_session_registrations — one row per paid registration. Written
--      ONLY by the Stripe webhook (service role, bypasses RLS) after Stripe
--      confirms payment, and by the cancellation/refund endpoint (also
--      service role) — mirrors analysis_purchases (migration 0006): no
--      client-writable insert/update policy exists, so a member can never
--      insert a "paid" row themselves.
--
--   4. one_on_one_requests — a member's submitted availability for a 1-on-1
--      Video Coaching session. No fake calendar/availability system — this
--      is a plain request queue a coach follows up on, same shape as
--      custom_plan_requests.
--
-- Storage: one new private bucket, member-coaching-content, with the exact
-- owner-folder RLS pattern already used for member-videos/analysis-frames
-- (migration 0004) — first path segment is the owning member's profile id,
-- compared to auth.uid() by the storage policy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. member_coaching_content
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'member_coaching_content_type') then
    create type member_coaching_content_type as enum ('workout', 'nutrition');
  end if;
end $$;

create table if not exists member_coaching_content (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  content_type member_coaching_content_type not null,
  title        text not null,
  notes        text,
  file_path    text,
  file_name    text,
  created_by   uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists member_coaching_content_profile_idx
  on member_coaching_content (profile_id, content_type, created_at desc);

alter table member_coaching_content enable row level security;

drop policy if exists member_coaching_content_read on member_coaching_content;
create policy member_coaching_content_read on member_coaching_content
  for select using (profile_id = auth.uid() or auth_is_staff());

-- Only staff ever write this table — never the member it's about, exactly
-- like assignments (migration 0017). A member cannot upload, edit, or
-- remove their own "coach-assigned" content.
drop policy if exists member_coaching_content_staff_insert on member_coaching_content;
create policy member_coaching_content_staff_insert on member_coaching_content
  for insert with check (auth_is_staff());

drop policy if exists member_coaching_content_staff_update on member_coaching_content;
create policy member_coaching_content_staff_update on member_coaching_content
  for update using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists member_coaching_content_staff_delete on member_coaching_content;
create policy member_coaching_content_staff_delete on member_coaching_content
  for delete using (auth_is_staff());

-- ---------------------------------------------------------------------------
-- 2. group_coaching_sessions
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'group_session_status') then
    create type group_session_status as enum ('scheduled', 'cancelled');
  end if;
end $$;

create table if not exists group_coaching_sessions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  start_at     timestamptz not null,
  price_cents  integer not null default 1000 check (price_cents > 0),
  capacity     integer check (capacity is null or capacity > 0),
  status       group_session_status not null default 'scheduled',
  created_by   uuid not null references profiles(id) on delete cascade,
  cancelled_by uuid references profiles(id) on delete set null,
  cancelled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists group_coaching_sessions_start_idx
  on group_coaching_sessions (start_at);

alter table group_coaching_sessions enable row level security;

-- Every signed-in member can browse the schedule (including cancelled
-- sessions, so a registered member still sees the cancellation on the page
-- that shows their registration) — this is a public-within-the-app catalog,
-- not sensitive data.
drop policy if exists group_coaching_sessions_read on group_coaching_sessions;
create policy group_coaching_sessions_read on group_coaching_sessions
  for select using (auth.uid() is not null);

drop policy if exists group_coaching_sessions_staff_insert on group_coaching_sessions;
create policy group_coaching_sessions_staff_insert on group_coaching_sessions
  for insert with check (auth_is_staff());

drop policy if exists group_coaching_sessions_staff_update on group_coaching_sessions;
create policy group_coaching_sessions_staff_update on group_coaching_sessions
  for update using (auth_is_staff()) with check (auth_is_staff());

-- No delete policy — a session is retired via status = 'cancelled', never
-- removed, so registrations/refund history always has something to point at.

-- ---------------------------------------------------------------------------
-- 3. group_session_registrations
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'group_registration_status') then
    create type group_registration_status as enum ('paid', 'refunded');
  end if;
end $$;

create table if not exists group_session_registrations (
  id                         uuid primary key default gen_random_uuid(),
  session_id                 uuid not null references group_coaching_sessions(id) on delete cascade,
  profile_id                 uuid not null references profiles(id) on delete cascade,
  status                     group_registration_status not null default 'paid',
  amount_cents               integer not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  stripe_refund_id           text,
  refunded_at                timestamptz,
  created_at                 timestamptz not null default now(),
  -- One paid registration per member per session — the row is only ever
  -- created after Stripe confirms payment (see the webhook), so this is also
  -- what stops a duplicate charge from ever producing a duplicate row.
  unique (session_id, profile_id)
);

create index if not exists group_session_registrations_session_idx
  on group_session_registrations (session_id);
create index if not exists group_session_registrations_profile_idx
  on group_session_registrations (profile_id, created_at desc);

alter table group_session_registrations enable row level security;

drop policy if exists group_session_registrations_read on group_session_registrations;
create policy group_session_registrations_read on group_session_registrations
  for select using (profile_id = auth.uid() or auth_is_staff());

-- Deliberately NO insert/update/delete policy for anyone, staff included.
-- This table is written only by the Stripe webhook and the admin cancel/
-- refund endpoint, both of which use the service-role client that bypasses
-- RLS entirely — mirrors analysis_purchases (migration 0006). Nothing a
-- browser sends can ever create or edit a registration row directly.

-- ---------------------------------------------------------------------------
-- 4. one_on_one_requests
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'one_on_one_request_status') then
    create type one_on_one_request_status as enum ('new', 'contacted', 'scheduled', 'closed');
  end if;
end $$;

create table if not exists one_on_one_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  availability text not null,
  notes        text,
  status       one_on_one_request_status not null default 'new',
  created_at   timestamptz not null default now()
);

create index if not exists one_on_one_requests_profile_idx
  on one_on_one_requests (profile_id, created_at desc);
create index if not exists one_on_one_requests_status_idx
  on one_on_one_requests (status, created_at desc);

alter table one_on_one_requests enable row level security;

drop policy if exists one_on_one_requests_read on one_on_one_requests;
create policy one_on_one_requests_read on one_on_one_requests
  for select using (profile_id = auth.uid() or auth_is_staff());

-- A member submits their own request directly (unlike the tables above,
-- there is no payment to gate this on) — mirrors custom_plan_requests.
drop policy if exists one_on_one_requests_own_insert on one_on_one_requests;
create policy one_on_one_requests_own_insert on one_on_one_requests
  for insert with check (profile_id = auth.uid());

-- Only staff update status (new -> contacted -> scheduled/closed).
drop policy if exists one_on_one_requests_staff_update on one_on_one_requests;
create policy one_on_one_requests_staff_update on one_on_one_requests
  for update using (auth_is_staff()) with check (auth_is_staff());

-- ---------------------------------------------------------------------------
-- 5. storage — member-coaching-content bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('member-coaching-content', 'member-coaching-content', false)
on conflict (id) do nothing;

drop policy if exists member_coaching_content_storage_read on storage.objects;
create policy member_coaching_content_storage_read on storage.objects
  for select using (
    bucket_id = 'member-coaching-content'
    and ((storage.foldername(name))[1] = auth.uid()::text or auth_is_staff())
  );

-- Only staff ever write these objects — a member never uploads their own
-- "coach-assigned" workout/nutrition file, matching member_coaching_content's
-- table-level policies above.
drop policy if exists member_coaching_content_storage_write on storage.objects;
create policy member_coaching_content_storage_write on storage.objects
  for insert with check (bucket_id = 'member-coaching-content' and auth_is_staff());

drop policy if exists member_coaching_content_storage_update on storage.objects;
create policy member_coaching_content_storage_update on storage.objects
  for update using (bucket_id = 'member-coaching-content' and auth_is_staff());

drop policy if exists member_coaching_content_storage_delete on storage.objects;
create policy member_coaching_content_storage_delete on storage.objects
  for delete using (bucket_id = 'member-coaching-content' and auth_is_staff());
