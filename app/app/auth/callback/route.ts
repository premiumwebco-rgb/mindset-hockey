import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Supabase redirects here after email confirmation or a password-reset link.
 * Exchanges the one-time code for a session cookie, then forwards on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  // Same-origin only. `//evil.example` also starts with '/' but browsers read
  // it as protocol-relative, so it must be rejected explicitly.
  const dest =
    next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
      ? next
      : '/dashboard';
  return NextResponse.redirect(`${origin}${dest}`);
}
