'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';
import type { MindsetSlide } from '@/lib/data';

/* ==========================================================================
   MINDSET SKILL GUIDE — SLIDESHOW

   Renders a mindset_lessons row's `slides` (migration 0017) as a single
   card-based lesson: one slide visible at a time, progress dots, Prev/Next.
   Deliberately plain client state (no routing, no URL/query sync) — this is
   a self-contained lesson component, same footprint as any other "reveal one
   step at a time" UI in the app, not a new page.

   Mobile-friendly by construction: one slide fills the card at any width,
   nav buttons are full touch targets (Button's 44px min-height convention),
   and the dot row wraps rather than overflowing on narrow screens.
   ========================================================================== */

const KIND_LABEL: Record<string, string> = {
  what: 'The skill',
  why: 'Why it matters',
  look: 'In the game',
  mistakes: 'Watch for this',
  technique: 'The technique',
  drill: 'Try this',
  takeaway: 'Take this with you',
};

export function MindsetSlideshow({ slides }: { slides: MindsetSlide[] }) {
  const [index, setIndex] = useState(0);
  if (slides.length === 0) return null;

  const slide = slides[Math.min(index, slides.length - 1)];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/[.08] px-5 py-4 sm:px-7">
        <div className="mb-2.5 flex items-center justify-between text-[11.5px] font-bold uppercase tracking-[.14em] text-silver-dim">
          <span>
            Slide {index + 1} of {slides.length}
          </span>
          <span className="text-electric-glow">{KIND_LABEL[slide.kind] ?? slide.kind}</span>
        </div>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= index ? 'bg-electric' : 'bg-navy-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[220px] px-5 py-7 sm:px-8 sm:py-10">
        <h2 className="display text-[clamp(20px,3.2vw,28px)]">{slide.heading}</h2>
        <p className="mt-4 max-w-[62ch] whitespace-pre-line text-[15.5px] leading-relaxed text-silver">
          {slide.body}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/[.08] px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-white/[.14] px-5 text-[13.5px] font-bold text-white transition-colors hover:border-electric disabled:pointer-events-none disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={isLast}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-electric px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-electric-glow disabled:pointer-events-none disabled:opacity-30"
        >
          {isLast ? 'Done' : 'Next →'}
        </button>
      </div>
    </Card>
  );
}
