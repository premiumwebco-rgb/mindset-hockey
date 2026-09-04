import { RUBRIC } from './types';
import { DEMO_MODE, type Session } from './session';
import { createServerClient } from './supabase/server';
import { assignTrainingResourcesFromReview } from './assignments';

/* ==========================================================================
   COACH VIDEO REVIEW — STRUCTURED RUBRIC SCORING

   analysis_reviews / review_scores / review_annotations / review_prescriptions
   (migration 0001) were defined but never written to anywhere in the app —
   ReviewEditor.tsx folded rubric sliders into a single formatted text blob
   saved to submission_feedback.body instead, with a header comment claiming
   the structured tables "belong to the AI Shot Analysis review flow at
   /coach/ai-queue". That claim does not hold up: those tables are not
   referenced by the AI Shot Analysis flow (or anywhere else) either — they
   were simply unused, real infrastructure.

   This module wires them up as the actual persistence layer for a coach's
   structured video review: per-rubric-point scores (review_scores), an
   overall score, summary/strengths/areas-to-improve (analysis_reviews,
   migration 0019 added the latter two columns), and real assigned resources
   (review_prescriptions, retargeted in migration 0018 from the legacy
   `drills` table to `training_resources`). RubricRadar (components/
   RubricRadar.tsx) and the member-facing /reviews/[id] page render this once
   it exists — nothing here invents new schema.

   submission_feedback (migration 0002) remains the human-written text
   review and status/reviewed_at driver — unchanged. This module is
   additive: a coach may publish a written review without a structured one
   (analysis_reviews is nullable-per-submission until a coach fills the
   rubric), and the member page must not assume one exists.

   ASSIGNING RESOURCES ALSO CREATES REAL ASSIGNMENTS (Core Coaching Workflow
   pass): selecting a resource here doesn't just attach it to this one
   review — it also creates an `assignments` row (content_type
   'training_resource', migration 0020) via lib/assignments.ts, the SAME
   assignment system /coach/assign and /development already use. This is
   deliberately not a second assignment mechanism: it calls the existing
   assignTrainingResourcesFromReview() helper, which dedupes against any
   already-active assignment of that resource for that player.
   ========================================================================== */

export interface RubricResourcePick {
  id: string;
  title: string;
  pillar: string | null;
}

export interface SaveRubricReviewInput {
  scores: { rubricPointId: number; score: number; note?: string }[];
  overallScore: number;
  summary: string;
  strengths: string;
  areasToImprove: string;
  resourceIds: string[];
}

/**
 * Upserts the structured review for one submission. `analysis_reviews.
 * submission_id` is UNIQUE (migration 0001), so this is a real upsert keyed
 * on that column — a coach revising a published review replaces the prior
 * scores/prescriptions rather than accumulating duplicates.
 *
 * Authorization: RLS ("staff write reviews"/"staff write scores"/"staff
 * write prescriptions", consolidated onto auth_is_staff() in migration
 * 0018) is the real boundary — requireStaff() at the API-route layer is a
 * fast-fail, not the authorization itself.
 */
export async function saveRubricReview(
  session: Session,
  submissionId: string,
  input: SaveRubricReviewInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (DEMO_MODE) return { ok: false, error: 'Demo mode — no backend connected.' };
  const supabase = await createServerClient();

  // vsub_staff_all already lets a coach read any submission; this resolves
  // WHO the assignment-side effect below is for. Not itself an
  // authorization check — RLS on the writes below is.
  const { data: submission } = await supabase
    .from('video_submissions')
    .select('profile_id')
    .eq('id', submissionId)
    .maybeSingle();

  const validPointIds = new Set(RUBRIC.map((r) => r.id));
  const scores = input.scores.filter(
    (s) => validPointIds.has(s.rubricPointId) && Number.isFinite(s.score) && s.score >= 1 && s.score <= 10
  );

  const { data: review, error: reviewError } = await supabase
    .from('analysis_reviews')
    .upsert(
      {
        submission_id: submissionId,
        reviewer_id: session.userId,
        overall_score: input.overallScore,
        summary_md: input.summary.trim().slice(0, 8000),
        strengths_md: input.strengths.trim().slice(0, 4000) || null,
        areas_to_improve_md: input.areasToImprove.trim().slice(0, 4000) || null,
        focus_points: [...new Set(scores.filter((s) => s.score <= 5).map((s) => s.rubricPointId))].slice(0, 5),
        published_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id' }
    )
    .select('id')
    .single();

  if (reviewError || !review) {
    return { ok: false, error: reviewError?.message ?? 'Could not save the rubric review.' };
  }

  // Replace-in-full: simplest correct semantics for a coach revising scores,
  // and avoids a stale review_scores row surviving a rubric point removal.
  const { error: deleteScoresError } = await supabase.from('review_scores').delete().eq('review_id', review.id);
  if (deleteScoresError) return { ok: false, error: deleteScoresError.message };

  if (scores.length > 0) {
    const { error: insertScoresError } = await supabase.from('review_scores').insert(
      scores.map((s) => ({
        review_id: review.id,
        rubric_point_id: s.rubricPointId,
        score: s.score,
        note: s.note?.trim().slice(0, 500) || null,
      }))
    );
    if (insertScoresError) return { ok: false, error: insertScoresError.message };
  }

  const { error: deletePrescError } = await supabase.from('review_prescriptions').delete().eq('review_id', review.id);
  if (deletePrescError) return { ok: false, error: deletePrescError.message };

  const resourceIds = [...new Set(input.resourceIds)].slice(0, 10);
  if (resourceIds.length > 0) {
    const { error: insertPrescError } = await supabase
      .from('review_prescriptions')
      .insert(resourceIds.map((resource_id) => ({ review_id: review.id, resource_id })));
    if (insertPrescError) return { ok: false, error: insertPrescError.message };

    // Side effect, best-effort: also surface these as real coach assignments
    // so they show up on /development "Assigned by your coach" and count
    // toward the player's active-assignment total on /dashboard. A failure
    // here must never fail the review save itself — the review and its
    // resource attachments above are already durably saved.
    if (submission?.profile_id) {
      try {
        await assignTrainingResourcesFromReview(session, submission.profile_id, resourceIds);
      } catch (err) {
        console.error('[video-review-rubric] resource assignment side effect failed:', (err as Error).message);
      }
    }
  }

  return { ok: true };
}

export interface RubricReviewForDisplay {
  overallScore: number | null;
  summary: string | null;
  strengths: string | null;
  areasToImprove: string | null;
  /** Only the rubric points a coach actually scored — never padded with a
   *  fake 0 for a point nobody scored yet. */
  scores: { rubricPointId: number; label: string; score: number; note: string | null }[];
  /** Every rubric point NOT present in `scores` — the honest "no data yet"
   *  set, so the UI can say so instead of rendering nothing or a fake value. */
  unscoredPointLabels: string[];
  resources: { id: string; title: string; pillar: string | null }[];
}

/**
 * Reads back a submission's structured review, resolving rubric labels and
 * real training_resources titles. Returns null when the coach has only
 * published a written review (submission_feedback) with no rubric scores —
 * callers must treat that as "no structured review yet", not an error.
 */
export async function getRubricReviewForSubmission(
  session: Session,
  submissionId: string
): Promise<RubricReviewForDisplay | null> {
  if (DEMO_MODE) return null;
  const supabase = await createServerClient();

  const { data: review } = await supabase
    .from('analysis_reviews')
    .select('id, overall_score, summary_md, strengths_md, areas_to_improve_md')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (!review) return null;

  const [{ data: scoreRows }, { data: prescRows }] = await Promise.all([
    supabase.from('review_scores').select('rubric_point_id, score, note').eq('review_id', review.id),
    supabase.from('review_prescriptions').select('resource_id').eq('review_id', review.id),
  ]);

  const resourceIds = [...new Set((prescRows ?? []).map((r) => r.resource_id).filter(Boolean))] as string[];
  const { data: resources } =
    resourceIds.length > 0
      ? await supabase.from('training_resources').select('id, title, pillar').in('id', resourceIds)
      : { data: [] as { id: string; title: string; pillar: string | null }[] };

  const rubricByid = Object.fromEntries(RUBRIC.map((r) => [r.id, r.label]));
  const scoredPointIds = new Set((scoreRows ?? []).map((s) => s.rubric_point_id));

  return {
    overallScore: review.overall_score,
    summary: review.summary_md,
    strengths: review.strengths_md,
    areasToImprove: review.areas_to_improve_md,
    scores: (scoreRows ?? []).map((s) => ({
      rubricPointId: s.rubric_point_id,
      label: rubricByid[s.rubric_point_id] ?? `Point ${s.rubric_point_id}`,
      score: s.score,
      note: s.note,
    })),
    unscoredPointLabels: RUBRIC.filter((r) => !scoredPointIds.has(r.id)).map((r) => r.label),
    resources: (resources ?? []).map((r) => ({ id: r.id, title: r.title, pillar: r.pillar })),
  };
}

/** Published training_resources for the coach's "assign resources" picker —
 *  the same catalogue members already see via /library, never a fixture. */
export async function listPublishedResourcesForPicker(): Promise<RubricResourcePick[]> {
  if (DEMO_MODE) return [];
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('training_resources')
    .select('id, title, pillar')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as RubricResourcePick[];
}
