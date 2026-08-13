-- ============================================================================
-- MINDSET HOCKEY — Initial schema
-- Postgres / Supabase.  Run with: supabase db push
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'membership_tier') then
    create type membership_tier as enum ('free', 'basic', 'advanced');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'sub_status') then
    create type sub_status as enum ('trialing','active','past_due','canceled','incomplete');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('member','coach','admin');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'pillar') then
    create type pillar as enum ('mindset','mechanics','skill','systems','habits','leadership');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'play_level') then
    create type play_level as enum ('house','a','aa','aaa','prep','junior','college');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'position_t') then
    create type position_t as enum ('forward','defense','goalie');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'handedness') then
    create type handedness as enum ('left','right');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type submission_status as enum ('uploading','pending','in_review','reviewed','rejected');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'pro_level') then
    create type pro_level as enum ('junior','aaa','college');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'shot_type') then
    create type shot_type as enum ('wrist','snap','slap','backhand','one_timer');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users — the account holder, usually the parent)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id                uuid primary key references auth.users on delete cascade,
  email             text not null,
  full_name         text,
  avatar_url        text,
  role              user_role not null default 'member',
  tier              membership_tier not null default 'free',
  is_parent_account boolean not null default true,
  timezone          text default 'America/New_York',
  marketing_opt_in  boolean not null default false,
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PLAYERS  (a profile may manage several kids)
-- ---------------------------------------------------------------------------
create table if not exists players (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references profiles(id) on delete cascade,
  first_name         text not null,
  last_name          text,
  birth_year         int  check (birth_year between 1990 and 2030),
  level              play_level not null default 'a',
  position           position_t not null default 'forward',
  shoots             handedness not null default 'right',
  stick_flex         int,
  team_name          text,
  focus_pillars      pillar[] not null default '{}',
  training_days_goal int not null default 4 check (training_days_goal between 1 and 7),
  avatar_url         text,
  created_at         timestamptz not null default now()
);
create index if not exists players_profile_id_idx on players (profile_id);

-- ---------------------------------------------------------------------------
-- BILLING
-- ---------------------------------------------------------------------------
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null references profiles(id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  tier                   membership_tier not null,
  status                 sub_status not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_end              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_profile_id_idx on subscriptions (profile_id);
create index if not exists subscriptions_stripe_customer_id_idx on subscriptions (stripe_customer_id);

-- Monthly video-analysis credits (Advanced tier). Reset on invoice.paid.
create table if not exists analysis_credits (
  profile_id   uuid primary key references profiles(id) on delete cascade,
  credits      int not null default 0 check (credits >= 0),
  period_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CONTENT  Track > Module > Lesson > Drill
-- ---------------------------------------------------------------------------
create table if not exists tracks (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  subtitle      text,
  description   text,
  pillar        pillar not null,
  required_tier membership_tier not null default 'basic',
  cover_url     text,
  sort_order    int not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists modules (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references tracks(id) on delete cascade,
  slug        text not null,
  title       text not null,
  description text,
  sort_order  int not null default 0,
  unique (track_id, slug)
);

create table if not exists lessons (
  id             uuid primary key default gen_random_uuid(),
  module_id      uuid references modules(id) on delete cascade,
  slug           text unique not null,
  title          text not null,
  summary        text,
  body_md        text,
  pillar         pillar not null,
  required_tier  membership_tier not null default 'basic',
  mux_playback_id text,
  duration_sec   int,
  thumbnail_url  text,
  sort_order     int not null default 0,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists lessons_module_id_idx on lessons (module_id);
create index if not exists lessons_pillar_required_tier_idx on lessons (pillar, required_tier);

create table if not exists drills (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  description    text,
  instructions_md text,
  pillar         pillar not null,
  skill_tags     text[] not null default '{}',   -- 'shooting','edges','hands','off-ice'
  rubric_points  int[] not null default '{}',    -- 1..7 shot-rubric points this drill fixes
  difficulty     int not null default 2 check (difficulty between 1 and 5),
  min_age        int default 8,
  max_age        int default 18,
  equipment      text[] not null default '{}',
  duration_min   int not null default 10,
  sets_reps      text,
  required_tier  membership_tier not null default 'basic',
  mux_playback_id text,
  thumbnail_url  text,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists drills_pillar_idx on drills (pillar);
create index if not exists drills_skill_tags_idx on drills using gin (skill_tags);
create index if not exists drills_rubric_points_idx on drills using gin (rubric_points);

create table if not exists lesson_drills (
  lesson_id uuid references lessons(id) on delete cascade,
  drill_id  uuid references drills(id)  on delete cascade,
  sort_order int not null default 0,
  primary key (lesson_id, drill_id)
);

-- Free/public articles for SEO + lead capture
create table if not exists articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  body_md      text,
  pillar       pillar,
  cover_url    text,
  seo_title    text,
  seo_desc     text,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROGRESS
-- ---------------------------------------------------------------------------
create table if not exists lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players(id) on delete cascade,
  lesson_id      uuid not null references lessons(id) on delete cascade,
  seconds_watched int not null default 0,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (player_id, lesson_id)
);

create table if not exists drill_logs (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  drill_id    uuid not null references drills(id) on delete cascade,
  reps        int,
  duration_min int,
  self_rating int check (self_rating between 1 and 5),
  notes       text,
  performed_on date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists drill_logs_player_id_performed_on_idx on drill_logs (player_id, performed_on desc);

-- Streaks / activity roll-up (one row per player per day)
create table if not exists activity_days (
  player_id     uuid not null references players(id) on delete cascade,
  day           date not null,
  sessions      int not null default 0,
  minutes       int not null default 0,
  primary key (player_id, day)
);

-- Weekly plans (rule-generated from level/age/position/focus)
create table if not exists weekly_plans (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references players(id) on delete cascade,
  week_start   date not null,
  theme        text,
  focus_pillar pillar,
  generated_by text not null default 'rules_v1',
  created_at   timestamptz not null default now(),
  unique (player_id, week_start)
);

create table if not exists plan_items (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references weekly_plans(id) on delete cascade,
  day_index    int not null check (day_index between 0 and 6),
  lesson_id    uuid references lessons(id) on delete set null,
  drill_id     uuid references drills(id)  on delete set null,
  duration_min int not null default 15,
  sort_order   int not null default 0,
  completed_at timestamptz
);
create index if not exists plan_items_plan_id_idx on plan_items (plan_id);

-- ---------------------------------------------------------------------------
-- ASSESSMENTS  (free funnel asset + in-app re-assessment)
-- ---------------------------------------------------------------------------
create table if not exists assessments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid references profiles(id) on delete cascade,
  player_id      uuid references players(id) on delete cascade,
  email          text,                 -- captured before signup on the free funnel
  answers        jsonb not null,
  total_score    int,                  -- 0..100
  pillar_scores  jsonb,                -- { mindset: 62, mechanics: 40, ... }
  weakest_pillar pillar,
  recommended_tier membership_tier,
  created_at     timestamptz not null default now()
);
create index if not exists assessments_email_idx on assessments (email);

-- ---------------------------------------------------------------------------
-- SHOT ANALYSIS  (Advanced tier — the moat)
-- ---------------------------------------------------------------------------
create table if not exists video_submissions (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  player_id         uuid not null references players(id) on delete cascade,
  status            submission_status not null default 'uploading',
  shot_type         shot_type not null default 'wrist',
  stick_flex        int,
  player_notes      text,
  storage_path_side text,
  storage_path_front text,
  mux_playback_id_side  text,
  mux_playback_id_front text,
  submitted_at      timestamptz not null default now(),
  -- Plain column, populated by the set_video_submission_sla trigger below.
  -- It CANNOT be a generated column: `timestamptz + interval` resolves to
  -- timestamptz_pl_interval, which Postgres marks STABLE (not IMMUTABLE)
  -- because interval arithmetic depends on the session TimeZone across DST
  -- boundaries. Generated columns require an IMMUTABLE expression, so the
  -- original definition failed with SQLSTATE 42P17.
  sla_due_at        timestamptz,
  reviewed_at       timestamptz,
  reviewer_id       uuid references profiles(id)
);
create index if not exists video_submissions_status_submitted_at_idx on video_submissions (status, submitted_at);
create index if not exists video_submissions_player_id_submitted_at_idx on video_submissions (player_id, submitted_at desc);

-- Keeps the 72-hour review SLA on video_submissions.
-- Only fills the value when the caller did not supply one, so the application
-- (app/api/reviews/route.ts sets sla_due_at explicitly) stays authoritative.
create or replace function set_video_submission_sla()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.sla_due_at is null then
    new.sla_due_at := coalesce(new.submitted_at, now()) + interval '72 hours';
  end if;
  return new;
end $$;

drop trigger if exists video_submissions_set_sla on video_submissions;
create trigger video_submissions_set_sla
  before insert or update of submitted_at on video_submissions
  for each row execute function set_video_submission_sla();

-- The canonical 7-point rubric, stored as reference data
create table if not exists rubric_points (
  id          int primary key check (id between 1 and 7),
  key         text unique not null,
  label       text not null,
  description text not null
);

insert into rubric_points (id, key, label, description) values
 (1,'weight_transfer','Weight Transfer','Load onto the back leg and drive through to the front; hips lead the hands.'),
 (2,'stick_flex','Stick Flex','Puck ahead of the blade, loading the shaft into the ice rather than slapping at it.'),
 (3,'release_timing','Release Timing','Blade closes at the right moment; deception before release.'),
 (4,'hand_positioning','Hand Positioning','Bottom hand drives, top hand pulls; correct separation for the shot type.'),
 (5,'follow_through','Follow Through','Blade finishes at the target with full extension.'),
 (6,'balance','Balance','Stable base through release; head steady and eyes up.'),
 (7,'shooting_posture','Shooting Posture','Athletic knee bend, chest up, shoulders square to intent.')
on conflict (id) do nothing;

create table if not exists analysis_reviews (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null unique references video_submissions(id) on delete cascade,
  reviewer_id    uuid not null references profiles(id),
  overall_score  int check (overall_score between 7 and 70),
  summary_md     text,
  voiceover_mux_playback_id text,
  focus_points   int[] not null default '{}',   -- rubric ids flagged for the month
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists review_scores (
  review_id      uuid not null references analysis_reviews(id) on delete cascade,
  rubric_point_id int not null references rubric_points(id),
  score          int not null check (score between 1 and 10),
  note           text,
  primary key (review_id, rubric_point_id)
);

create table if not exists review_annotations (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references analysis_reviews(id) on delete cascade,
  timestamp_ms  int not null,
  angle         text not null default 'side',
  rubric_point_id int references rubric_points(id),
  body          text not null
);

create table if not exists review_prescriptions (
  review_id  uuid not null references analysis_reviews(id) on delete cascade,
  drill_id   uuid not null references drills(id) on delete cascade,
  sort_order int not null default 0,
  primary key (review_id, drill_id)
);

-- ---------------------------------------------------------------------------
-- PRO BREAKDOWNS  (Advanced tier)
-- ---------------------------------------------------------------------------
create table if not exists pro_breakdowns (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  player_label    text,               -- e.g. "NHL Winger — Right Shot"
  level           pro_level not null,
  shot_type       shot_type not null default 'wrist',
  shoots          handedness not null default 'right',
  description     text,
  mux_playback_id text,
  release_frame_ms int,               -- used to auto-align side-by-side comparisons
  thumbnail_url   text,
  required_tier   membership_tier not null default 'advanced',
  is_published    boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists pro_annotations (
  id              uuid primary key default gen_random_uuid(),
  breakdown_id    uuid not null references pro_breakdowns(id) on delete cascade,
  timestamp_ms    int not null,
  rubric_point_id int references rubric_points(id),
  body            text not null
);

create table if not exists comparisons (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  submission_id uuid references video_submissions(id) on delete set null,
  breakdown_id  uuid references pro_breakdowns(id) on delete set null,
  sync_offset_ms int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MARKETING
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text,          -- 'exit_popup','assessment','footer','pageflow'
  player_age int,
  level      play_level,
  utm        jsonb,
  created_at timestamptz not null default now(),
  unique (email, source)
);

create table if not exists testimonials (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  author_role  text,          -- 'Parent, 14U A' / 'Player, 16U AAA'
  quote        text not null,
  avatar_url   text,
  result_note  text,
  is_featured  boolean not null default false,
  consent_on_file boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- HELPERS
-- ============================================================================
create or replace function tier_rank(t membership_tier) returns int
language sql immutable as $$
  select case t when 'free' then 0 when 'basic' then 1 when 'advanced' then 2 end;
$$;

create or replace function current_tier() returns membership_tier
language sql stable security definer set search_path = public as $$
  select coalesce((select tier from profiles where id = auth.uid()), 'free'::membership_tier);
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('coach','admin'));
$$;

create or replace function owns_player(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from players where id = p and profile_id = auth.uid());
$$;

-- auto-create a profile on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  insert into public.analysis_credits (profile_id, credits) values (new.id, 0);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles           enable row level security;
alter table players            enable row level security;
alter table subscriptions      enable row level security;
alter table analysis_credits   enable row level security;
alter table tracks             enable row level security;
alter table modules            enable row level security;
alter table lessons            enable row level security;
alter table drills             enable row level security;
alter table lesson_drills      enable row level security;
alter table articles           enable row level security;
alter table lesson_progress    enable row level security;
alter table drill_logs         enable row level security;
alter table activity_days      enable row level security;
alter table weekly_plans       enable row level security;
alter table plan_items         enable row level security;
alter table assessments        enable row level security;
alter table video_submissions  enable row level security;
alter table rubric_points      enable row level security;
alter table analysis_reviews   enable row level security;
alter table review_scores      enable row level security;
alter table review_annotations enable row level security;
alter table review_prescriptions enable row level security;
alter table pro_breakdowns     enable row level security;
alter table pro_annotations    enable row level security;
alter table comparisons        enable row level security;
alter table leads              enable row level security;
alter table testimonials       enable row level security;

-- profiles
drop policy if exists "read own profile" on profiles;
create policy "read own profile"   on profiles for select using (id = auth.uid() or is_staff());
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (id = auth.uid());

-- players
drop policy if exists "own players" on players;
create policy "own players" on players for all
  using (profile_id = auth.uid() or is_staff())
  with check (profile_id = auth.uid());

-- billing (read-only to the user; writes happen via service role in webhooks)
drop policy if exists "read own subscription" on subscriptions;
create policy "read own subscription" on subscriptions for select using (profile_id = auth.uid());
drop policy if exists "read own credits" on analysis_credits;
create policy "read own credits"      on analysis_credits for select using (profile_id = auth.uid());

-- ---- CONTENT GATING: the core of the business -----------------------------
drop policy if exists "tracks by tier" on tracks;
create policy "tracks by tier" on tracks for select
  using (is_published and tier_rank(required_tier) <= tier_rank(current_tier()));

drop policy if exists "modules follow track" on modules;
create policy "modules follow track" on modules for select
  using (exists (select 1 from tracks t
                 where t.id = track_id and t.is_published
                   and tier_rank(t.required_tier) <= tier_rank(current_tier())));

drop policy if exists "lessons by tier" on lessons;
create policy "lessons by tier" on lessons for select
  using (is_published and tier_rank(required_tier) <= tier_rank(current_tier()));

drop policy if exists "drills by tier" on drills;
create policy "drills by tier" on drills for select
  using (is_published and tier_rank(required_tier) <= tier_rank(current_tier()));

drop policy if exists "lesson_drills readable" on lesson_drills;
create policy "lesson_drills readable" on lesson_drills for select using (true);
drop policy if exists "articles public" on articles;
create policy "articles public"        on articles     for select using (published_at is not null);
drop policy if exists "rubric public" on rubric_points;
create policy "rubric public"          on rubric_points for select using (true);
drop policy if exists "testimonials public" on testimonials;
create policy "testimonials public"    on testimonials for select using (consent_on_file);

drop policy if exists "pro breakdowns advanced" on pro_breakdowns;
create policy "pro breakdowns advanced" on pro_breakdowns for select
  using (is_published and tier_rank(required_tier) <= tier_rank(current_tier()));

drop policy if exists "pro annotations follow" on pro_annotations;
create policy "pro annotations follow" on pro_annotations for select
  using (exists (select 1 from pro_breakdowns b
                 where b.id = breakdown_id and b.is_published
                   and tier_rank(b.required_tier) <= tier_rank(current_tier())));

-- ---- PROGRESS -------------------------------------------------------------
drop policy if exists "own lesson progress" on lesson_progress;
create policy "own lesson progress" on lesson_progress for all
  using (owns_player(player_id)) with check (owns_player(player_id));
drop policy if exists "own drill logs" on drill_logs;
create policy "own drill logs" on drill_logs for all
  using (owns_player(player_id)) with check (owns_player(player_id));
drop policy if exists "own activity" on activity_days;
create policy "own activity" on activity_days for all
  using (owns_player(player_id)) with check (owns_player(player_id));
drop policy if exists "own plans" on weekly_plans;
create policy "own plans" on weekly_plans for all
  using (owns_player(player_id)) with check (owns_player(player_id));
drop policy if exists "own plan items" on plan_items;
create policy "own plan items" on plan_items for all
  using (exists (select 1 from weekly_plans w where w.id = plan_id and owns_player(w.player_id)));

drop policy if exists "own assessments" on assessments;
create policy "own assessments" on assessments for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() or profile_id is null);

-- ---- ANALYSIS -------------------------------------------------------------
drop policy if exists "own submissions" on video_submissions;
create policy "own submissions" on video_submissions for select
  using (profile_id = auth.uid() or is_staff());
drop policy if exists "create own submissions" on video_submissions;
create policy "create own submissions" on video_submissions for insert
  with check (profile_id = auth.uid() and owns_player(player_id)
              and tier_rank(current_tier()) >= tier_rank('advanced'));
drop policy if exists "staff update submissions" on video_submissions;
create policy "staff update submissions" on video_submissions for update using (is_staff());

drop policy if exists "read own reviews" on analysis_reviews;
create policy "read own reviews" on analysis_reviews for select
  using (is_staff() or exists (select 1 from video_submissions s
         where s.id = submission_id and s.profile_id = auth.uid()
           and analysis_reviews.published_at is not null));
drop policy if exists "staff write reviews" on analysis_reviews;
create policy "staff write reviews" on analysis_reviews for all using (is_staff());

drop policy if exists "read own scores" on review_scores;
create policy "read own scores" on review_scores for select
  using (exists (select 1 from analysis_reviews r where r.id = review_id));
drop policy if exists "staff write scores" on review_scores;
create policy "staff write scores" on review_scores for all using (is_staff());

drop policy if exists "read own annotations" on review_annotations;
create policy "read own annotations" on review_annotations for select
  using (exists (select 1 from analysis_reviews r where r.id = review_id));
drop policy if exists "staff write annotations" on review_annotations;
create policy "staff write annotations" on review_annotations for all using (is_staff());

drop policy if exists "read own prescriptions" on review_prescriptions;
create policy "read own prescriptions" on review_prescriptions for select
  using (exists (select 1 from analysis_reviews r where r.id = review_id));
drop policy if exists "staff write prescriptions" on review_prescriptions;
create policy "staff write prescriptions" on review_prescriptions for all using (is_staff());

drop policy if exists "own comparisons" on comparisons;
create policy "own comparisons" on comparisons for all
  using (owns_player(player_id)) with check (owns_player(player_id));

-- ---- MARKETING ------------------------------------------------------------
drop policy if exists "anyone can submit a lead" on leads;
create policy "anyone can submit a lead" on leads for insert with check (true);
drop policy if exists "staff read leads" on leads;
create policy "staff read leads"         on leads for select using (is_staff());

-- ============================================================================
-- VIEWS
-- ============================================================================
create or replace view player_streaks as
select player_id,
       count(*) filter (where day >= current_date - 30) as active_days_30,
       max(day) as last_active
from activity_days
group by player_id;

create or replace view coach_queue as
select s.id, s.player_id, p.first_name, p.last_name, p.level,
       s.shot_type, s.submitted_at, s.sla_due_at, s.status,
       (s.sla_due_at < now()) as overdue
from video_submissions s
join players p on p.id = s.player_id
where s.status in ('pending','in_review')
order by s.submitted_at asc;
