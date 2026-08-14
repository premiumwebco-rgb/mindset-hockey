'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary, used when the root layout itself throws.
 *
 * It must render its own <html> and <body> because the layout that normally
 * provides them is the thing that failed. Styling is inline for the same
 * reason — globals.css may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#05070c',
          color: '#c7d0dc',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: '#3fa9ff',
            }}
          >
            Mindset Hockey
          </p>
          <h1 style={{ margin: '10px 0 0', fontSize: 30, color: '#fff' }}>Something went wrong</h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6 }}>
            The site hit an unexpected error. Please try again in a moment.
          </p>

          <button
            onClick={reset}
            style={{
              marginTop: 28,
              padding: '12px 24px',
              borderRadius: 10,
              border: 0,
              background: '#0a84ff',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>

          <p style={{ margin: '28px 0 0', fontSize: 13, color: '#8895a7' }}>
            If it keeps happening, email braydencastiglia@gmail.com or call (240) 435-6511.
            {error.digest ? ` Reference: ${error.digest}` : ''}
          </p>
        </div>
      </body>
    </html>
  );
}
