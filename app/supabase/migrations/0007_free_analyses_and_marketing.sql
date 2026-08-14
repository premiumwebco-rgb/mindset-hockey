-- ============================================================================
-- 0007 — 3 FREE ANALYSES ON SIGNUP  +  EXPLICIT MARKETING CONSENT
--
-- TWO CHANGES, BOTH ADDITIVE.
--
-- 1. FREE SIGNUP CREDITS
--    New accounts receive 3 AI Shot Analyses. These are NOT a fourth quota
--    system: they are rows in the existing `analysis_purchases` ledger with
--    amount_cents = 0 and kind = 'signup_free'. Everything already built for
--    paid credits — persistence across weekly resets, atomic reservation,
--    append-only accounting, RLS that forbids member writes — applies to them
--    unchanged.
--
--    Granted by the EXISTING handle_new_user() trigger, so the credit is
--    created in the same transaction as the profile. A user cannot skip it,
--    replay it, or grant themselves more: the trigger is the only writer and
--    the unique index below caps it at one grant per account for all time.
--
-- 2. MARKETING CONSENT
--    `profiles.marketing_opt_in` already exists (0001). It is extended here
--    with the timestamps needed to prove consent and to drive the onboarding
--    sequence. No second preferences table is created.
--
-- Existing migrations are untouched. No data is deleted.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREDIT KIND
-- ---------------------------------------------------------------------------
alter table analysis_purchases
  -- 'signup_free'  the 3 acquisition credits, amount_cents = 0
  -- 'purchase'     a paid $0.50 add-on
  -- Existing rows are all real purchases, so 'purchase' is the correct default.
  add column if not exists kind text not null default 'purchase';

-- Paid rows must still carry a Stripe reference; free grants never do. Both
-- constraints are enforced together so a free grant cannot be forged to look
-- like a payment, and a payment cannot be recorded without provenance.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'analysis_purchases_kind_check'
  ) then
    alter table analysis_purchases
      add constraint analysis_purchases_kind_check check (
        (kind = 'signup_free' and amount_cents = 0)
        or (kind = 'purchase' and stripe_session_id is not null)
      );
  end if;
end $$;

-- HARD CAP: at most ONE free grant per account, ever. Enforced by the database
-- rather than by application logic, so it survives concurrency, retries, and
-- any future code path that might try to re-grant.
create unique index if not exists analysis_purchases_one_free_grant
  on analysis_purchases (profile_id)
  where kind = 'signup_free';

comment on column analysis_purchases.kind is
  'signup_free = the 3 free acquisition credits (amount 0). purchase = a paid $0.50 add-on.';

-- ---------------------------------------------------------------------------
-- 2. GRANT 3 FREE ANALYSES AT SIGNUP
--    Extends the EXISTING handle_new_user() trigger rather than adding a
--    second one, so profile creation and the credit grant stay atomic.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role, tier, marketing_opt_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'member',
    'none',
    -- Consent is explicit and opt-IN. Anything other than a literal 'true'
    -- from the signup form means no marketing email. Never defaulted on.
    coalesce(new.raw_user_meta_data->>'marketing_opt_in', 'false') = 'true'
  )
  on conflict (id) do nothing;

  -- The acquisition offer: 3 free AI Shot Analyses, as zero-cost credits in
  -- the normal ledger. `on conflict do nothing` plus the unique index above
  -- make this idempotent even if the trigger somehow fires twice.
  insert into analysis_purchases (profile_id, kind, quantity, amount_cents, currency)
  values (new.id, 'signup_free', 3, 0, 'usd')
  on conflict do nothing;

  -- Starts the onboarding email clock. Whether anything is actually sent
  -- depends on marketing_opt_in; transactional mail is unaffected.
  update profiles
     set onboarding_sequence_started_at = now(),
         marketing_opt_in_at = case when marketing_opt_in then now() else null end
   where id = new.id;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. MARKETING CONSENT STATE
--    Extends the existing profiles.marketing_opt_in — no new table.
-- ---------------------------------------------------------------------------
alter table profiles
  -- When consent was given. Null when never opted in.
  add column if not exists marketing_opt_in_at timestamptz,
  -- When it was withdrawn. Non-null means STOP, regardless of the boolean.
  add column if not exists marketing_opt_out_at timestamptz,
  -- Drives the day-0/2/5/10/17/25 onboarding schedule.
  add column if not exists onboarding_sequence_started_at timestamptz,
  -- Frequency guard, so the sender can enforce a minimum gap.
  add column if not exists last_marketing_email_at timestamptz,
  -- How far through the sequence this member is. 0 = nothing sent yet.
  add column if not exists onboarding_email_step int not null default 0,
  -- One-click unsubscribe without requiring a login. Random and unguessable.
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_idx
  on profiles (unsubscribe_token);

-- Finding who is due an email, without scanning every profile.
create index if not exists profiles_onboarding_due_idx
  on profiles (onboarding_sequence_started_at, onboarding_email_step)
  where marketing_opt_in = true and marketing_opt_out_at is null;

comment on column profiles.marketing_opt_out_at is
  'Set the moment a member unsubscribes. Non-null means send no marketing email, whatever marketing_opt_in says.';

-- ---------------------------------------------------------------------------
-- 4. RLS
--    profiles already has RLS with a self-update policy, and the
--    protect_privileged_profile_columns() trigger from 0002 strips privileged
--    columns from any non-admin update. The marketing columns below are
--    deliberately NOT added to that trigger: a member is allowed to change
--    their own marketing preference. They are not allowed to touch
--    entitlement, and analysis_purchases still has no member write policy, so
--    nobody can mint themselves credits.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- VERIFY
-- ============================================================================
--   -- every account should have exactly one free grant of 3
--   select p.email,
--          coalesce(sum(ap.quantity) filter (where ap.kind = 'signup_free'), 0) as free_granted,
--          coalesce(sum(ap.quantity) filter (where ap.kind = 'purchase'), 0)    as purchased,
--          p.marketing_opt_in, p.marketing_opt_in_at, p.marketing_opt_out_at
--     from profiles p
--     left join analysis_purchases ap on ap.profile_id = p.id
--    group by p.id order by p.created_at desc limit 20;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5. LET FREE ACCOUNTS ACTUALLY USE THEIR FREE ANALYSES
--
-- THIS IS NOT A WEAKENING OF RLS. It is the missing half of the free offer.
--
-- A new account is tier 'none'. Every AI policy from 0004 requires
-- auth_has_tier('basic'), so without this change the 3 free credits would be
-- granted and then be unusable — the insert would be denied at the database.
--
-- The fix adds a SECOND, equally strict entitlement path: you may create an
-- analysis if you hold an unspent credit. Crucially, credit is not
-- self-assertable — `analysis_purchases` has no member INSERT/UPDATE/DELETE
-- policy, so the only ways to hold one are the signup trigger (capped at one
-- grant per account by a unique index) or a Stripe-verified purchase.
--
-- Everything else is unchanged: ownership is still enforced, paid tiers still
-- pass on tier, and nobody gains access to anything they have not been
-- granted.
-- ---------------------------------------------------------------------------

create or replace function has_analysis_credits()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      coalesce(sum(ap.quantity), 0)
      > (select count(*) from ai_usage u
          where u.profile_id = auth.uid()
            and u.entitlement_source = 'purchased')
    from analysis_purchases ap
    where ap.profile_id = auth.uid()
  ), false);
$$;

revoke execute on function has_analysis_credits() from anon;

comment on function has_analysis_credits() is
  'True when the caller holds at least one unspent analysis credit (free signup grant or paid add-on). Credits can only be created by the signup trigger or a verified Stripe webhook.';

-- shot_analyses: allow an entitled-by-credit member to create and read.
-- READ is deliberately NOT entitlement-gated. A member must always be able to
-- open analyses they already ran, even after their credits are spent and
-- before they subscribe — losing access to work you already did would be
-- wrong, and the row is still only ever their own. Writing is where
-- entitlement matters, and that is gated below.
--
-- (An earlier draft ORed a tier check with `profile_id = auth.uid()`, which
-- reduced to exactly this but read as though a tier check applied. Simplified
-- so the policy says what it means.)
drop policy if exists analyses_own_read on shot_analyses;
create policy analyses_own_read on shot_analyses
  for select using (profile_id = auth.uid() or auth_is_staff());

drop policy if exists analyses_own_insert on shot_analyses;
create policy analyses_own_insert on shot_analyses
  for insert with check (
    profile_id = auth.uid()
    and (auth_has_tier('basic') or has_analysis_credits())
  );

drop policy if exists analyses_own_update on shot_analyses;
create policy analyses_own_update on shot_analyses
  for update using (
    profile_id = auth.uid()
    and (auth_has_tier('basic') or has_analysis_credits())
  )
  with check (profile_id = auth.uid());

-- storage: the same second path, so a free member can upload the clip that
-- their free analysis is for. Ownership by path prefix is unchanged.
drop policy if exists member_videos_own_write on storage.objects;
create policy member_videos_own_write on storage.objects
  for insert with check (
    bucket_id in ('member-videos','analysis-frames')
    and (storage.foldername(name))[1] = auth.uid()::text
    and (auth_has_tier('basic') or has_analysis_credits())
  );

drop policy if exists member_videos_own_update on storage.objects;
create policy member_videos_own_update on storage.objects
  for update using (
    bucket_id in ('member-videos','analysis-frames')
    and (storage.foldername(name))[1] = auth.uid()::text
    and (auth_has_tier('basic') or has_analysis_credits())
  );

-- READ and DELETE on storage are deliberately NOT re-scoped: a member must
-- keep access to their own footage regardless of entitlement. Those policies
-- from 0004 already allow it and are left exactly as they are.
