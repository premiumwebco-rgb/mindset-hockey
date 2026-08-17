import type { Metadata } from 'next';
import { Anton, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-anton',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Mindset Hockey — Talent helps. Mindset changes careers.',
    template: '%s · Mindset Hockey',
  },
  description:
    'A complete player development system for hockey players 10–18. Shot mechanics, mindset, habits and coach video analysis — built by a player who went from 16U A to Jr hockey.',
  openGraph: {
    type: 'website',
    siteName: 'Mindset Hockey',
    title: 'Mindset Hockey — Talent helps. Mindset changes careers.',
    description:
      'The complete player development system from a player who went 16U A → AAA → Jr hockey.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter)' }}>{children}</body>
    </html>
  );
}
