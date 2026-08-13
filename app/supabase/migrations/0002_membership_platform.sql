-- ============================================================================
-- MINDSET HOCKEY — Membership platform
--
-- Supersedes the tier model in 0001_init.sql:
--   free/basic/advanced  ->  none/basic/premium
--   adds admin-grade RBAC, AI analysis, workouts, nutrition, mindset,
--   progress tracking and full RLS.
--
-- The policies in this file are the real access boundary. The Next.js guards
-- are convenience; a forged cookie still cannot read a premium row.
--
-- Run:  supabase db push
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. TIER MIGRATION
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tier_t') then
    create type tier_t as enum ('none', 'basic', 'premium');
  end if;
end $$;

alter table profiles add column if not exists tier_new tier_t not null default 'none';

-- map the old enum across, if 0001 was ever applied with data
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'tier'
  ) then
    update profiles set tier_new = case
      when tier::text = 'advanced' then 'premium'::tier_t
      when tier::text = 'basic'    then 'basic'::tier_t
      else 'none'::tier_t
    end;
    alter table profiles drop column tier;
  end if;
end $$;

alter table profiles rename column tier_new to tier;

alter table profiles
  add column if not exists subscription_active boolean not null default false,
  add column if not exists stripe_customer_id  text,
  add column if not exists setup_fee_paid_at   timestamptz,
  add column if not exists access_expires_at   timestamptz,
  add column if not exists suspended           boolean not null default false;

create index if not exists profiles_tier_idx on profiles (tier);
create index if not exists profiles_stripe_customer_idx on profiles (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS
--    SECURITY DEFINER so policies can call them without recursive RLS.
--    search_path is pinned to defeat search-path hijacking.
-- ---------------------------------------------------------------------------
create or replace function auth_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role::text from profiles where id = auth.uid()), 'anon');
$$;

create or replace function auth_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function auth_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','coach') from profiles where id = auth.uid()), false);
$$;

/**
 * The single source of truth for entitlement.
 * Admins always pass. Everyone else needs BOTH the tier rank AND an active
 * subscription — so a cancelled Premium member loses premium rows immediately.
 */
create or replace function auth_has_tier(required tier_t)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      case
        when p.role = 'admin' then true
        when p.suspended then false
        when required = 'none' then true
        when not p.subscription_active then false
        else
          case required
            when 'basic'   then p.tier in ('basic','premium')
            when 'premium' then p.tier = 'premium'
            else false
          end
      end
    from profiles p where p.id = auth.uid()
  ), false);
$$;

revoke execute on function auth_role()             from anon;
revoke execute on function auth_is_admin()         from anon;
revoke execute on function auth_is_staff()         from anon;
revoke execute on function auth_has_tier(tier_t)   from anon;

-- ---------------------------------------------------------------------------
-- 2. SUBSCRIPTIONS  (mirrors Stripe; Stripe remains authoritative)
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'sub_status_t') then
    create type sub_status_t as enum
      ('incomplete','trialing','active','past_due','canceled','unpaid');
  end if;
end $$;

create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null references profiles(id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  tier                   tier_t not null,
  status                 sub_status_t not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  setup_fee_paid         boolean not null default false,
  setup_fee_amount       int,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_profile_idx on subscriptions (profile_id);
create index if not exists subscriptions_status_idx  on subscriptions (status);

-- Idempotency ledger so a replayed Stripe webhook can't double-apply.
create table if not exists stripe_events (
  id            text primary key,          -- Stripe event id (evt_...)
  type          text not null,
  processed_at  timestamptz not null default now(),
  payload       jsonb
);

-- ---------------------------------------------------------------------------
-- 3. AI SHOT ANALYSIS
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'analysis_status_t') then
    create type analysis_status_t as enum
      ('uploading','queued','analyzing','analyzed','in_review','reviewed','failed');
  end if;
end $$;

create table if not exists shot_analyses (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  player_id        uuid references players(id) on delete set null,

  -- storage
  video_path       text not null,               -- storage object path
  video_mime       text,
  video_bytes      bigint,
  duration_sec     numeric(6,2),
  angle            text default 'side',         -- side | front | rear | other
  frame_paths      text[] not null default '{}',

  shot_type        shot_type not null default 'wrist',
  player_notes     text,

  status           analysis_status_t not null default 'uploading',
  error_message    text,

  -- AI result
  overall_score    int check (overall_score between 0 and 100),
  scores           jsonb,      -- RubricScore[]
  strengths        text[],
  weaknesses       text[],
  recommendations  text[],
  action_steps     text[],
  priorities       text[],
  drill_slugs      text[],
  summary          text,
  confidence       numeric(3,2),
  footage_issues   text[],
  model            text,

  analyzed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists shot_analyses_profile_idx on shot_analyses (profile_id, created_at desc);
create index if not exists shot_analyses_status_idx  on shot_analyses (status);

-- Coach commentary layered on top of an AI analysis.
create table if not exists analysis_reviews (
  id            uuid primary key default gen_random_uuid(),
  analysis_id   uuid not null references shot_analyses(id) on delete cascade,
  reviewer_id   uuid not null references profiles(id) on delete cascade,
  body          text not null,
  score_overrides jsonb,
  complete      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists analysis_reviews_analysis_idx on analysis_reviews (analysis_id);

-- ---------------------------------------------------------------------------
-- 4. VIDEO REVIEW SUBMISSIONS (game / practice footage, human review)
-- ---------------------------------------------------------------------------
create table if not exists video_submissions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  player_id     uuid references players(id) on delete set null,
  kind          text not null default 'game',   -- game | practice | training
  title         text not null,
  video_path    text not null,
  notes         text,
  status        analysis_status_t not null default 'queued',
  sla_due_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists video_submissions_profile_idx on video_submissions (profile_id, created_at desc);
create index if not exists video_submissions_status_idx  on video_submissions (status);

create table if not exists submission_feedback (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references video_submissions(id) on delete cascade,
  reviewer_id   uuid not null references profiles(id) on delete cascade,
  body          text not null,
  video_path    text,                            -- optional coach voiceover clip
  complete      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists submission_feedback_sub_idx on submission_feedback (submission_id);

-- ---------------------------------------------------------------------------
-- 5. WORKOUT PLANS
-- ---------------------------------------------------------------------------
create table if not exists workout_plans (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  description   text,
  phase         text not null default 'off_season',  -- in_season | off_season | playoffs
  focus         text not null default 'strength',    -- strength | power | speed | mobility | recovery
  weeks         int  not null default 4,
  required_tier tier_t not null default 'premium',
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references workout_plans(id) on delete cascade,
  week          int  not null,
  day           int  not null,
  title         text not null,
  blocks        jsonb not null default '[]',   -- [{name, sets, reps, tempo, notes}]
  duration_min  int,
  unique (plan_id, week, day)
);

create table if not exists workout_completions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  rpe           int check (rpe between 1 and 10),
  notes         text,
  unique (profile_id, session_id)
);
create index if not exists workout_completions_profile_idx on workout_completions (profile_id, completed_at desc);

-- ---------------------------------------------------------------------------
-- 6. NUTRITION
-- ---------------------------------------------------------------------------
create table if not exists meal_plans (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  description   text,
  goal          text not null default 'performance',  -- performance | gain | lean | recovery
  calories      int,
  protein_g     int,
  carbs_g       int,
  fat_g         int,
  days          jsonb not null default '[]',   -- [{day, meals:[{name, items[], kcal}]}]
  grocery_list  text[],
  required_tier tier_t not null default 'premium',
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists nutrition_resources (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  category      text not null default 'guide',  -- guide | hydration | recovery | game_day
  body_md       text,
  required_tier tier_t not null default 'premium',
  is_published  boolean not null default false
);

-- ---------------------------------------------------------------------------
-- 7. MINDSET TRAINING
-- ---------------------------------------------------------------------------
create table if not exists mindset_lessons (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  week          int not null,
  topic         text not null,   -- confidence | toughness | accountability | ...
  title         text not null,
  summary       text,
  body_md       text,
  exercise_md   text,
  reflection_prompts text[],
  required_tier tier_t not null default 'premium',
  is_published  boolean not null default false,
  sort_order    int not null default 0
);

create table if not exists mindset_progress (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  lesson_id     uuid not null references mindset_lessons(id) on delete cascade,
  completed_at  timestamptz,
  reflection    text,
  unique (profile_id, lesson_id)
);
create index if not exists mindset_progress_profile_idx on mindset_progress (profile_id);

-- ---------------------------------------------------------------------------
-- 8. PROGRESS TRACKING
-- ---------------------------------------------------------------------------
create table if not exists metrics (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  player_id     uuid references players(id) on delete set null,
  kind          text not null,   -- shot_mph | squat_1rm | sprint_10y | analysis_score | ...
  value         numeric(10,2) not null,
  unit          text,
  recorded_at   date not null default current_date,
  source        text default 'manual',   -- manual | ai_analysis | coach
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists metrics_profile_kind_idx on metrics (profile_id, kind, recorded_at desc);

create table if not exists goals (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  title         text not null,
  metric_kind   text,
  target_value  numeric(10,2),
  due_on        date,
  achieved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists goals_profile_idx on goals (profile_id);

create table if not exists achievements (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  code          text not null,
  label         text not null,
  earned_at     timestamptz not null default now(),
  unique (profile_id, code)
);

-- ---------------------------------------------------------------------------
-- 9. LEADS (custom-quote requests from the public site)
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text,
  player_age    int,
  level         text,
  plan_interest text,
  goals         text,
  source        text default 'website',
  handled       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists leads_created_idx on leads (created_at desc);

-- ---------------------------------------------------------------------------
-- 10. ADMIN AUDIT LOG
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id            bigserial primary key,
  actor_id      uuid references profiles(id) on delete set null,
  action        text not null,
  target_table  text,
  target_id     text,
  meta          jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles            enable row level security;
alter table subscriptions       enable row level security;
alter table shot_analyses       enable row level security;
alter table analysis_reviews    enable row level security;
alter table video_submissions   enable row level security;
alter table submission_feedback enable row level security;
alter table workout_plans       enable row level security;
alter table workout_sessions    enable row level security;
alter table workout_completions enable row level security;
alter table meal_plans          enable row level security;
alter table nutrition_resources enable row level security;
alter table mindset_lessons     enable row level security;
alter table mindset_progress    enable row level security;
alter table metrics             enable row level security;
alter table goals               enable row level security;
alter table achievements        enable row level security;
alter table leads               enable row level security;
alter table audit_log           enable row level security;
alter table stripe_events       enable row level security;

-- ---- profiles --------------------------------------------------------------
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or auth_is_staff());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
-- NOTE: tier / role / subscription_active are protected by the trigger below,
-- so a member cannot escalate themselves by updating their own row.

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles
  for all using (auth_is_admin()) with check (auth_is_admin());

create or replace function protect_privileged_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth_is_admin() then return new; end if;
  new.role                := old.role;
  new.tier                := old.tier;
  new.subscription_active := old.subscription_active;
  new.suspended           := old.suspended;
  new.stripe_customer_id  := old.stripe_customer_id;
  new.access_expires_at   := old.access_expires_at;
  return new;
end $$;

drop trigger if exists trg_protect_profile_cols on profiles;
create trigger trg_protect_profile_cols
  before update on profiles
  for each row execute function protect_privileged_profile_columns();

-- ---- subscriptions (read-only to the member; writes come from the webhook) --
drop policy if exists subs_self_read on subscriptions;
create policy subs_self_read on subscriptions
  for select using (profile_id = auth.uid() or auth_is_staff());

drop policy if exists subs_admin_all on subscriptions;
create policy subs_admin_all on subscriptions
  for all using (auth_is_admin()) with check (auth_is_admin());

-- ---- shot analyses (PREMIUM) -----------------------------------------------
drop policy if exists analyses_own_read on shot_analyses;
create policy analyses_own_read on shot_analyses
  for select using (
    (profile_id = auth.uid() and auth_has_tier('premium')) or auth_is_staff()
  );

drop policy if exists analyses_own_insert on shot_analyses;
create policy analyses_own_insert on shot_analyses
  for insert with check (profile_id = auth.uid() and auth_has_tier('premium'));

drop policy if exists analyses_own_update on shot_analyses;
create policy analyses_own_update on shot_analyses
  for update using (profile_id = auth.uid() and auth_has_tier('premium'))
  with check (profile_id = auth.uid());

drop policy if exists analyses_own_delete on shot_analyses;
create policy analyses_own_delete on shot_analyses
  for delete using (profile_id = auth.uid() or auth_is_admin());

drop policy if exists analyses_staff_all on shot_analyses;
create policy analyses_staff_all on shot_analyses
  for all using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists analysis_reviews_read on analysis_reviews;
create policy analysis_reviews_read on analysis_reviews
  for select using (
    auth_is_staff() or exists (
      select 1 from shot_analyses a
      where a.id = analysis_id and a.profile_id = auth.uid() and auth_has_tier('premium')
    )
  );

drop policy if exists analysis_reviews_staff_write on analysis_reviews;
create policy analysis_reviews_staff_write on analysis_reviews
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---- video submissions (PREMIUM) -------------------------------------------
drop policy if exists vsub_own_read on video_submissions;
create policy vsub_own_read on video_submissions
  for select using (
    (profile_id = auth.uid() and auth_has_tier('premium')) or auth_is_staff()
  );

drop policy if exists vsub_own_insert on video_submissions;
create policy vsub_own_insert on video_submissions
  for insert with check (profile_id = auth.uid() and auth_has_tier('premium'));

drop policy if exists vsub_staff_all on video_submissions;
create policy vsub_staff_all on video_submissions
  for all using (auth_is_staff()) with check (auth_is_staff());

drop policy if exists sfeedback_read on submission_feedback;
create policy sfeedback_read on submission_feedback
  for select using (
    auth_is_staff() or exists (
      select 1 from video_submissions v
      where v.id = submission_id and v.profile_id = auth.uid() and auth_has_tier('premium')
    )
  );

drop policy if exists sfeedback_staff_write on submission_feedback;
create policy sfeedback_staff_write on submission_feedback
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---- content tables: published + tier-gated ---------------------------------
drop policy if exists workout_plans_read on workout_plans;
create policy workout_plans_read on workout_plans
  for select using ((is_published and auth_has_tier(required_tier)) or auth_is_staff());
drop policy if exists workout_plans_admin on workout_plans;
create policy workout_plans_admin on workout_plans
  for all using (auth_is_admin()) with check (auth_is_admin());

drop policy if exists workout_sessions_read on workout_sessions;
create policy workout_sessions_read on workout_sessions
  for select using (exists (
    select 1 from workout_plans p
    where p.id = plan_id and ((p.is_published and auth_has_tier(p.required_tier)) or auth_is_staff())
  ));
drop policy if exists workout_sessions_admin on workout_sessions;
create policy workout_sessions_admin on workout_sessions
  for all using (auth_is_admin()) with check (auth_is_admin());

drop policy if exists workout_completions_own on workout_completions;
create policy workout_completions_own on workout_completions
  for all using (profile_id = auth.uid() or auth_is_staff())
  with check (profile_id = auth.uid() and auth_has_tier('premium'));

drop policy if exists meal_plans_read on meal_plans;
create policy meal_plans_read on meal_plans
  for select using ((is_published and auth_has_tier(required_tier)) or auth_is_staff());
drop policy if exists meal_plans_admin on meal_plans;
create policy meal_plans_admin on meal_plans
  for all using (auth_is_admin()) with check (auth_is_admin());

drop policy if exists nutrition_resources_read on nutrition_resources;
create policy nutrition_resources_read on nutrition_resources
  for select using ((is_published and auth_has_tier(required_tier)) or auth_is_staff());
drop policy if exists nutrition_resources_admin on nutrition_resources;
create policy nutrition_resources_admin on nutrition_resources
  for all using (auth_is_admin()) with check (auth_is_admin());

drop policy if exists mindset_lessons_read on mindset_lessons;
create policy mindset_lessons_read on mindset_lessons
  for select using ((is_published and auth_has_tier(required_tier)) or auth_is_staff());
drop policy if exists mindset_lessons_admin on mindset_lessons;
create policy mindset_lessons_admin on mindset_lessons
  for all using (auth_is_admin()) with check (auth_is_admin());

drop policy if exists mindset_progress_own on mindset_progress;
create policy mindset_progress_own on mindset_progress
  for all using (profile_id = auth.uid() or auth_is_staff())
  with check (profile_id = auth.uid() and auth_has_tier('premium'));

-- ---- tracking: basic sees own basic metrics, premium sees everything --------
drop policy if exists metrics_own on metrics;
create policy metrics_own on metrics
  for all using (profile_id = auth.uid() or auth_is_staff())
  with check (profile_id = auth.uid() and auth_has_tier('basic'));

drop policy if exists goals_own on goals;
create policy goals_own on goals
  for all using (profile_id = auth.uid() or auth_is_staff())
  with check (profile_id = auth.uid() and auth_has_tier('basic'));

drop policy if exists achievements_own on achievements;
create policy achievements_own on achievements
  for select using (profile_id = auth.uid() or auth_is_staff());
drop policy if exists achievements_staff_write on achievements;
create policy achievements_staff_write on achievements
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---- leads: insert-only for the public, read for staff ---------------------
drop policy if exists leads_public_insert on leads;
create policy leads_public_insert on leads for insert with check (true);
drop policy if exists leads_staff_read on leads;
create policy leads_staff_read on leads
  for all using (auth_is_staff()) with check (auth_is_staff());

-- ---- admin-only tables ------------------------------------------------------
drop policy if exists audit_admin on audit_log;
create policy audit_admin on audit_log
  for all using (auth_is_admin()) with check (auth_is_admin());

-- stripe_events: service role only. No policy = no access via anon/authed key.

-- ============================================================================
-- STORAGE
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('member-videos', 'member-videos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('analysis-frames', 'analysis-frames', false)
on conflict (id) do nothing;

-- Objects live under  <user-uuid>/<analysis-id>/<file>  so ownership is the
-- first path segment. Premium tier required to write.
drop policy if exists member_videos_own_read on storage.objects;
create policy member_videos_own_read on storage.objects
  for select using (
    bucket_id in ('member-videos','analysis-frames')
    and ((storage.foldername(name))[1] = auth.uid()::text or auth_is_staff())
  );

drop policy if exists member_videos_own_write on storage.objects;
create policy member_videos_own_write on storage.objects
  for insert with check (
    bucket_id in ('member-videos','analysis-frames')
    and (storage.foldername(name))[1] = auth.uid()::text
    and auth_has_tier('premium')
  );

drop policy if exists member_videos_own_delete on storage.objects;
create policy member_videos_own_delete on storage.objects
  for delete using (
    bucket_id in ('member-videos','analysis-frames')
    and ((storage.foldername(name))[1] = auth.uid()::text or auth_is_admin())
  );

-- ============================================================================
-- NEW USER BOOTSTRAP
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role, tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'member',
    'none'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- ADMIN BOOTSTRAP
-- Set the owner account to admin. Run once after signing up.
--   update profiles set role='admin', tier='premium', subscription_active=true
--   where email = 'braydencastiglia@gmail.com';
-- ============================================================================
