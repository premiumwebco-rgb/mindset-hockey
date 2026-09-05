-- ============================================================================
-- 0021 -- IN-PERSON TRAINING WAITLIST (Summer Training / Summer Camp, at
-- Capital Clubhouse)
--
-- Additive only. Same shape as custom_plan_requests (the member-facing
-- "Request Custom Plan" submissions, see app/api/coaching/request/route.ts):
-- a member inserts their own row through the session client, RLS is the
-- actual enforcement, staff/admin can read every row for follow-up. This is
-- a plain interest/waitlist collector, not a new entitlement, permission, or
-- Stripe path -- nothing existing is touched.
-- ============================================================================

create table if not exists program_waitlist_signups (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  program      text not null check (program in ('summer_training', 'summer_camp')),
  notes        text,
  status       text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'declined')),
  handled_by   uuid references profiles(id),
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists program_waitlist_signups_profile_idx
  on program_waitlist_signups (profile_id);

alter table program_waitlist_signups enable row level security;

-- Same shape as custom_plan_requests_own_insert: a member can only ever
-- insert a row for themselves.
drop policy if exists program_waitlist_signups_own_insert on program_waitlist_signups;
create policy program_waitlist_signups_own_insert on program_waitlist_signups
  for insert
  with check (profile_id = auth.uid());

-- Member reads their own rows; staff/admin can read every row to follow up.
drop policy if exists program_waitlist_signups_read on program_waitlist_signups;
create policy program_waitlist_signups_read on program_waitlist_signups
  for select
  using (profile_id = auth.uid() or auth_is_staff());

comment on table program_waitlist_signups is
  'Interest/waitlist signups for in-person programs at Capital Clubhouse (Summer Training, Summer Camp), submitted from /in-person. Not a registration or payment system.';
