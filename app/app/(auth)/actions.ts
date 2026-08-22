'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/session';
import { planFromParam } from '@/lib/plans';

/* ==========================================================================
   Auth server actions.

   These are the only place credentials are handled. Supabase sets the session
   cookie via the SSR client, middleware refreshes it on every request, and RLS
   reads auth.uid() from it.
   ========================================================================== */

export interface AuthState {
  error?: string;
  message?: string;
}

function siteOrigin(h: Headers): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`
  );
}

/**
 * Only ever redirect to a path on this site.
 *
 * `startsWith('/')` alone is not enough: `//evil.example` also starts with a
 * slash and browsers treat it as a protocol-relative URL, which would make
 * `?next=` an open redirect straight off the login page. A backslash is
 * rejected for the same reason — some browsers normalise `/\` to `//`.
 */
function safeNext(raw: unknown, fallback = '/dashboard'): string {
  const next = typeof raw === 'string' ? raw : '';
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (DEMO_MODE) redirect('/dashboard');

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));

  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: do not reveal whether the address has an account.
    return { error: 'That email and password combination is not right.' };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('name') ?? '').trim();

  // Route boundary: normalise the plan once, here. Downstream we only ever
  // pass `plan.slug` outward. A signup with no plan is still valid — it just
  // lands on onboarding instead of checkout.
  const plan = planFromParam(formData.get('plan') as string | null);
  const destination = plan ? `/upgrade?plan=${plan.slug}` : '/onboarding';

  if (DEMO_MODE) redirect(destination);

  if (!email || !password) return { error: 'Enter your email and password.' };
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.' };

  const supabase = await createServerClient();
  const h = await headers();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // Read by handle_new_user() in migration 0007. Explicit opt-in only:
        // an absent or unchecked box records false.
        marketing_opt_in: formData.get('marketing_opt_in') === 'true' ? 'true' : 'false',
      },
      // The chosen plan has to survive the round trip through the member's
      // inbox, so it rides along in `next` and the callback forwards to it.
      emailRedirectTo: `${siteOrigin(h)}/auth/callback?next=${encodeURIComponent(destination)}`,
    },
  });

  if (error) return { error: error.message };

  // Supabase's anti-enumeration guard: signing up with an email that already
  // has a CONFIRMED account returns a success with a synthetic user object
  // (empty `identities`) and no session, rather than an error — so a stranger
  // can't use signup to probe which emails are registered. Catch it here and
  // send them to log in instead of silently carrying on as if a new,
  // signed-out account had been created.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: 'An account with that email already exists. Log in instead.' };
  }

  // Normal path: email confirmation is OFF for this project, so signUp()
  // returns an authenticated session immediately. The SSR client above has
  // already written the session cookies via createServerClient()'s setAll,
  // so the redirect below carries the member in signed in.
  if (data.session) {
    revalidatePath('/', 'layout');
    redirect(destination);
  }

  // Reachable only if email confirmation somehow is still required on this
  // Supabase project (see DEPLOY.md) — signup itself still succeeded, so
  // point them at login rather than stalling on a "check your email" screen.
  return {
    message: `Account created for ${email}. Log in to continue${plan ? ` to checkout for the ${plan.name}` : ''}.`,
  };
}

export async function signOutAction(): Promise<void> {
  if (!DEMO_MODE) {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Enter your email address.' };

  if (DEMO_MODE) {
    return { message: 'Demo mode — no email is actually sent.' };
  }

  const supabase = await createServerClient();
  const h = await headers();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin(h)}/auth/callback?next=/account/password`,
  });

  // Always the same response, whether or not the address exists — otherwise
  // this endpoint becomes an account-enumeration oracle.
  return {
    message: `If an account exists for ${email}, a reset link is on its way.`,
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (DEMO_MODE) return { message: 'Demo mode — password unchanged.' };

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'Use at least 8 characters.' };
  if (password !== confirm) return { error: 'Those passwords do not match.' };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/account?password=updated');
}
