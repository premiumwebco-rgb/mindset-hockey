'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
   UNSAVED-CHANGES PROTECTION

   Seeding a cookbook means filling long forms repeatedly, so losing one to a
   stray click or a back-swipe is a real cost, not a theoretical one.

   Two layers, because neither covers the other's case:

     1. beforeunload — catches tab close, refresh, and typing a new URL. The
        browser shows its own generic dialog; the message string is ignored by
        every modern browser, which is why none is provided. This does NOT
        fire for in-app client-side navigation.

     2. confirmDiscard() — an explicit check the component calls on Cancel,
        covering the in-app case beforeunload cannot see.

   MOBILE NOTE: iOS Safari does not reliably fire beforeunload on tab close or
   back-swipe. Layer 2 is what actually protects a phone user, which is why
   Cancel is guarded rather than relying on the browser alone.

   Dirtiness is computed by comparing a JSON snapshot of the draft taken at
   mount against the live draft. That is O(size-of-form) per render, which for
   a recipe is trivial, and it avoids every field having to remember to flag
   itself as touched.
   ========================================================================== */

export function useUnsavedChanges<T>(current: T) {
  // The pristine snapshot. A ref, not state — updating it must never re-render.
  const baseline = useRef<string>(JSON.stringify(current));
  const [saved, setSaved] = useState(false);

  const isDirty = !saved && JSON.stringify(current) !== baseline.current;

  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      // preventDefault + returnValue is the cross-browser incantation that
      // triggers the native "Leave site?" prompt.
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /**
   * Call from Cancel. Returns true when it is safe to discard — either because
   * nothing changed, or because the user confirmed.
   */
  const confirmDiscard = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }, [isDirty]);

  /**
   * Call after a successful save so the form stops reporting itself dirty and
   * the browser stops warning on the way out.
   */
  const markSaved = useCallback(() => setSaved(true), []);

  return { isDirty, confirmDiscard, markSaved };
}
