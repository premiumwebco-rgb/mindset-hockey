import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindsethockey.com';

/**
 * Search engines get the marketing site and nothing else.
 *
 * The member portal, auth screens and API are all disallowed: they are either
 * behind a login (so a crawler only ever sees a redirect) or they are endpoints
 * that should never appear in a search result. This is not a security control —
 * RLS is — but it keeps private surfaces out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/account',
          '/admin',
          '/coach',
          '/analysis',
          '/reviews',
          '/workouts',
          '/nutrition',
          '/mindset',
          '/progress',
          '/library',
          '/drills',
          '/shot-course',
          '/pro-breakdowns',
          '/onboarding',
          '/upgrade',
          '/login',
          '/signup',
          '/forgot-password',
          '/thank-you',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
