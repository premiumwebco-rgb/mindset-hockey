-- ---------------------------------------------------------------------------
-- 0011 — fix trg_protect_profile_cols silently reverting service-role writes
--
-- BUG: protect_privileged_profile_columns() only let a write through when
-- auth_is_admin() was true. auth_is_admin() depends on auth.uid(), which is
-- NULL for any request made with the service-role key (no user JWT, no
-- `sub` claim). Every write from createAdminClient() — the admin Users page
-- (app/api/admin/user/route.ts) AND the Stripe webhook's applyEntitlement()/
-- upsertSubscription() (app/api/stripe/webhook/route.ts) — is such a
-- request. So the trigger silently reset new.role / new.tier /
-- new.subscription_active / new.suspended / new.stripe_customer_id /
-- new.access_expires_at back to old.* on every one of those writes, with no
-- error surfaced anywhere: the UPDATE "succeeded," it just rewrote the
-- existing values.
--
-- FIX: also trust the service-role JWT itself (auth.role() = 'service_role',
-- Supabase's built-in helper reading the request JWT's `role` claim). This
-- does not change behavior for a signed-in member updating their own row
-- through the anon-key + RLS path — auth.role() there is 'authenticated',
-- not 'service_role', so the trigger still reverts those columns for them
-- exactly as before. It only recognizes the service-role client, and access
-- to that key is already gated: the admin route requires requireAdmin()
-- before ever calling createAdminClient(), and the webhook requires a valid
-- Stripe signature.
--
-- Nothing else changes: same columns protected, same admin bypass, same RLS
-- policies untouched.
-- ---------------------------------------------------------------------------

create or replace function protect_privileged_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth_is_admin() or auth.role() = 'service_role' then return new; end if;
  new.role                := old.role;
  new.tier                := old.tier;
  new.subscription_active := old.subscription_active;
  new.suspended            := old.suspended;
  new.stripe_customer_id  := old.stripe_customer_id;
  new.access_expires_at   := old.access_expires_at;
  return new;
end $$;
