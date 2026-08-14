/* ==========================================================================
   Presentation helpers shared by the analysis screens.
   Pure functions only — safe to import from client components.
   ========================================================================== */

import type { CategoryScore, ConfidenceLevel, EvidenceBasis } from './rubric';

export type AnalysisStatus =
  | 'uploading'
  | 'queued'
  | 'analyzing'
  | 'analyzed'
  | 'in_review'
  | 'reviewed'
  | 'failed';

export const STATUS_LABEL: Record<AnalysisStatus, string> = {
  uploading: 'Uploading',
  queued: 'Queued',
  analyzing: 'Analyzing',
  analyzed: 'Complete',
  in_review: 'With a coach',
  reviewed: 'Coach reviewed',
  failed: 'Failed',
};

export const STATUS_CLASS: Record<AnalysisStatus, string> = {
  uploading: 'border-white/20 text-silver-dim',
  queued: 'border-white/20 text-silver-dim',
  analyzing: 'border-electric/50 bg-electric/10 text-electric-glow',
  analyzed: 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]',
  in_review: 'border-amber/40 bg-amber/10 text-amber',
  reviewed: 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]',
  failed: 'border-red-400/40 bg-red-400/10 text-red-300',
};

export const CONFIDENCE_CLASS: Record<ConfidenceLevel, string> = {
  high: 'border-[#3ddc84]/40 bg-[#3ddc84]/10 text-[#3ddc84]',
  medium: 'border-amber/40 bg-amber/10 text-amber',
  low: 'border-white/20 text-silver-dim',
};

export const BASIS_LABEL: Record<EvidenceBasis, string> = {
  observed: 'Observed',
  inferred: 'Inferred',
  unable_to_evaluate: 'Unable to evaluate',
};

/** Color for a 1-10 category score. Null reads as neutral, never as bad. */
export function scoreClass(score: number | null): string {
  if (score === null) return 'text-silver-dim';
  if (score >= 8) return 'text-[#3ddc84]';
  if (score >= 6) return 'text-electric-glow';
  if (score >= 4) return 'text-amber';
  return 'text-red-300';
}

/**
 * Parses whatever came back from the `category_scores` jsonb column.
 * Anything unrecognisable is dropped rather than rendered as a broken row.
 */
export function parseCategories(raw: unknown): CategoryScore[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is CategoryScore =>
      typeof c === 'object' && c !== null && typeof (c as CategoryScore).key === 'string'
  );
}

export function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
