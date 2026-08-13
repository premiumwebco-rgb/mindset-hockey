'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/session';

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

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (DEMO_MODE) redirect('/dashboard');

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/dashboard');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: do not reveal whether the address has an account.
    return { error: 'That email and password combination is not right.' };
  }

  revalidatePath('/', 'layout');
  redirect(next.startsWith('/') ? next : '/dashboard');
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (DEMO_MODE) redirect('/onboarding');

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('name') ?? '').trim();

  if (!email || !password) return { error: 'Enter your email and password.' };
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.' };

  const supabase = await createServerClient();
  const h = await headers();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteOrigin(h)}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // With email confirmation on, there is no session until they click the link.
  if (!data.session) {
    return {
      message: `Check ${email} for a confirmation link to finish creating your account.`,
    };
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding');
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
