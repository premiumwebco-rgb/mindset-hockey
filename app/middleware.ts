import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Middleware does two jobs:
 *
 *  1. Refreshes the Supabase auth cookie on every request, so server
 *     components never see a stale session.
 *  2. Bounces unauthenticated visitors away from member routes before any
 *     page code runs.
 *
 * It deliberately does NOT check tier. Tier is checked in the page guards and,
 * authoritatively, by RLS in Postgres. Middleware runs on the edge with only
 * the JWT available; querying the profile here would add a DB round trip to
 * every request for a check the database is already making.
 */

const PROTECTED = [
  '/dashboard',
  '/analysis',
  '/workouts',
  '/nutrition',
  '/mindset',
  '/progress',
  '/reviews',
  '/account',
  '/onboarding',
  '/admin',
  '/coach',
  // The purchase flow. Checkout sessions may only ever be created for a
  // signed-in account, so the page that offers them is gated like any other.
  '/upgrade',
];

const AUTH_PAGES = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode: no Supabase configured, let everything through so the UI can
  // be previewed. DEMO_MODE in lib/session.ts stays in sync with this check.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Revalidates the token and rotates the cookie if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Keep the query string: `/upgrade?plan=premium` must survive the bounce
    // through login, or the member loses the plan they picked on the way in.
    login.search = '';
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const dest = request.nextUrl.clone();
    // An already-signed-in member clicking "Get Started" on the public pricing
    // page lands on /signup?plan=… — they don't need an account, they need
    // checkout. Sending them to the dashboard would silently drop the plan
    // they just chose and dead-end the purchase.
    const plan = request.nextUrl.searchParams.get('plan');
    dest.search = '';
    if (pathname === '/signup' && plan) {
      dest.pathname = '/upgrade';
      dest.searchParams.set('plan', plan);
    } else {
      dest.pathname = '/dashboard';
    }
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the Stripe webhook — the webhook
     * authenticates with a signature, not a cookie, and must not be touched.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)',
  ],
};
