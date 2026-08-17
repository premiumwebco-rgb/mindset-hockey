import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireFeature, DEMO_MODE } from '@/lib/session';
import { createServerClient } from '@/lib/supabase/server';
import { createPlaybackUrl } from '@/lib/ai/storage';
import { Card, Eyebrow, Button } from '@/components/ui';
import { SmartVideo } from '@/components/media/SmartMedia';
import { RUBRIC_BY_CATEGORY, type CategoryScore } from '@/lib/ai/rubric';
import {
  STATUS_LABEL,
  STATUS_CLASS,
  CONFIDENCE_CLASS,
  BASIS_LABEL,
  scoreClass,
  parseCategories,
  formatDate,
  type AnalysisStatus,
} from '@/lib/ai/present';
import {
  getWeakCategories,
  tagsForWeakCategories,
  buildRecommendations,
  type Recommendation,
} from '@/lib/ai/recommendations';
import { getRecommendableResources } from '@/lib/library';
import DeleteAnalysis from './DeleteAnalysis';
import AnalysisProgress from './AnalysisProgress';
import RetryAnalysis from './RetryAnalysis';

export const metadata = { title: 'Shot Analysis — Mindset Hockey' };

/** Matches STALL_AFTER_MS in app/api/analysis/run/route.ts. */
const STALL_AFTER_MS = 5 * 60 * 1000;

interface Row {
  id: string;
  profile_id: string;
  status: AnalysisStatus;
  overall_score: number | null;
  category_scores: unknown;
  strengths: string[] | null;
  improvement_areas: string[] | null;
  recommendations: string[] | null;
  summary: string | null;
  confidence: number | null;
  footage_issues: string[] | null;
  graded_count: number | null;
  model: string | null;
  processing_ms: number | null;
  shot_type: string;
  angle: string;
  player_notes: string | null;
  video_path: string | null;
  video_bucket: string | null;
  frame_paths: string[] | null;
  error_message: string | null;
  requested_review: boolean | null;
  created_at: string;
  analyzed_at: string | null;
}

function CategoryRow({ cat }: { cat: CategoryScore }) {
  const meta = RUBRIC_BY_CATEGORY[cat.key];
  const insufficient = cat.status === 'insufficient_footage';

  return (
    <div className="border-t border-white/[.06] py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold text-white">{meta?.label ?? cat.key}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] ${CONFIDENCE_CLASS[cat.confidence]}`}
            >
              {cat.confidence} confidence
            </span>
            <span className="rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-silver-dim">
              {BASIS_LABEL[cat.basis]}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {insufficient ? (
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-silver-dim">
              Not gradeable
            </span>
          ) : (
            <span className={`display text-[30px] leading-none ${scoreClass(cat.score)}`}>
              {cat.score}
              <span className="text-[15px] text-silver-dim">/10</span>
            </span>
          )}
        </div>
      </div>

      <p className={`mt-3 text-[14.5px] ${insufficient ? 'text-silver-dim' : 'text-silver'}`}>
        {cat.observation}
      </p>

      {cat.strength && (
        <p className="mt-2 text-[14px] text-[#3ddc84]">
          <span className="font-semibold">Strength:</span> {cat.strength}
        </p>
      )}
      {cat.improvement && (
        <p className="mt-2 text-[14px] text-amber">
          <span className="font-semibold">Work on:</span> {cat.improvement}
        </p>
      )}
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <Card className="p-6">
      <h2 className="display text-[19px]">{title}</h2>
      <ul className="mt-4 grid gap-2.5">
        {items.map((item, i) => (
          <li key={i} className={`flex gap-2.5 text-[14.5px] ${tone}`}>
            <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span className="text-silver">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function AnalysisReport({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireFeature('ai_shot_analysis');
  const { id } = await params;

  if (DEMO_MODE) notFound();

  const supabase = await createServerClient();

  // RLS scopes this to rows the caller owns (or staff). A guessed id belonging
  // to another member returns nothing and 404s — the database enforces that,
  // not this page.
  const { data, error } = await supabase
    .from('shot_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) notFound();
  const row = data as Row;

  const categories = parseCategories(row.category_scores);
  const videoUrl = row.video_path
    ? await createPlaybackUrl(supabase, row.video_path, row.video_bucket ?? 'member-videos')
    : null;

  const confidencePct = row.confidence !== null ? Math.round(row.confidence * 100) : null;
  const isComplete = row.status === 'analyzed';
  const needsHuman = row.status === 'in_review' || row.status === 'failed';
  // Anything still moving. Previously these three statuses fell through every
  // branch on this page and rendered an empty body.
  const inProgress =
    row.status === 'uploading' || row.status === 'queued' || row.status === 'analyzing';
  // A retry re-runs the model against the frames archived on the first attempt.
  // Without those frames there is nothing to re-run, so the option is hidden
  // rather than offered and then failed.
  const retryable = (row.frame_paths?.length ?? 0) > 0;

  // --------------------------------------------------------------------
  // AI-recommended training (Phase 4). Deterministic, non-AI mapping from
  // this analysis's own weak categories onto the training library — see
  // lib/ai/recommendations.ts for the ranking logic and lib/library.ts's
  // getRecommendableResources() for the entitlement-aware lookup.
  //
  // Wrapped defensively: a bug or a down dependency here must never take
  // out the page that shows the actual analysis a player is here to see.
  // Worst case, the "Your Biggest Opportunities" section just doesn't
  // render — the rest of the report is unaffected either way.
  // --------------------------------------------------------------------
  const weakCategories = isComplete ? getWeakCategories(categories) : [];
  let recommendations: Recommendation[] = [];
  if (weakCategories.length > 0) {
    try {
      const tags = tagsForWeakCategories(weakCategories);
      const candidates = await getRecommendableResources(session, tags);
      recommendations = buildRecommendations(weakCategories, candidates);
    } catch (err) {
      console.error('[analysis] recommendation lookup failed:', (err as Error).message);
      recommendations = [];
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>AI Shot Analysis</Eyebrow>
          <h1 className="display text-[clamp(26px,4.5vw,40px)] capitalize">
            {row.shot_type.replace('_', ' ')} · {row.angle} angle
          </h1>
          <p className="mt-2 text-[14px] text-silver-dim">
            {formatDate(row.created_at)}
            {row.model && isComplete && <> · {row.model}</>}
            {row.processing_ms && isComplete && <> · {(row.processing_ms / 1000).toFixed(1)}s</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${STATUS_CLASS[row.status]}`}
          >
            {STATUS_LABEL[row.status]}
          </span>
          <Link
            href="/analysis"
            className="-m-2 inline-block p-2 text-[14px] font-semibold text-silver-dim underline underline-offset-4 hover:text-white"
          >
            All analyses
          </Link>
        </div>
      </div>

      {/* ------------------------------------------- still running ------- */}
      {inProgress && (
        <AnalysisProgress
          id={row.id}
          status={row.status as 'uploading' | 'queued' | 'analyzing'}
          startedAtIso={row.analyzed_at ?? row.created_at}
          stalledAfterMs={STALL_AFTER_MS}
          canRetry={retryable}
        />
      )}

      {/* ---------------------------------------- needs a human ---------- */}
      {needsHuman && (
        <div className="mt-6 rounded-xl border border-amber/40 bg-amber/[.07] px-6 py-5">
          <h2 className="display text-[19px] text-amber">No scores were produced</h2>
          <p className="mt-2 max-w-[64ch] text-[14.5px] text-silver">
            {row.error_message ??
              'The analysis could not be completed from this footage.'}
          </p>
          <p className="mt-2 max-w-[64ch] text-[13.5px] text-silver-dim">
            Nothing has been invented to fill the gap, and your video is still stored — a coach can
            watch it and give you a manual breakdown.
          </p>

          {retryable && (
            <>
              <p className="mt-3 max-w-[64ch] text-[13.5px] text-silver-dim">
                If this looked like a temporary problem rather than a footage problem, you can run
                the analysis again on the frames already saved from this clip — no re-upload needed.
              </p>
              <div className="mt-4">
                <RetryAnalysis id={row.id} />
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          {/* ------------------------------------------- headline score --- */}
          {isComplete && (
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="grid h-[104px] w-[104px] shrink-0 place-items-center rounded-2xl border border-electric/30 bg-electric/[.07]">
                  {row.overall_score !== null ? (
                    <div className="text-center">
                      <span className="display text-[40px] leading-none text-electric-glow">
                        {row.overall_score}
                      </span>
                      <span className="block text-[10px] font-bold uppercase tracking-[.14em] text-silver-dim">
                        / 100
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 text-center text-[10px] font-bold uppercase tracking-[.12em] text-silver-dim">
                      No score
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {row.overall_score !== null ? (
                    <>
                      <p className="text-[13px] text-silver-dim">
                        Averaged across the{' '}
                        <span className="font-semibold text-silver">
                          {row.graded_count ?? categories.filter((c) => c.score !== null).length} of 10
                        </span>{' '}
                        categories the footage could actually support.
                      </p>
                      {confidencePct !== null && (
                        <div className="mt-3">
                          <div className="mb-1.5 flex justify-between text-[13.5px]">
                            <span className="text-silver">Overall confidence</span>
                            <span className="tabular-nums text-silver-dim">{confidencePct}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-700">
                            <div
                              className="h-full rounded-full bg-electric transition-[width] duration-500"
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[14.5px] text-silver">
                      Nothing in this clip could be graded with confidence. That is an honest
                      result, not a failure — the footage does not show enough.
                    </p>
                  )}
                </div>
              </div>

              {row.summary && (
                <p className="mt-5 border-t border-white/[.06] pt-5 text-[15px] leading-relaxed text-silver">
                  {row.summary}
                </p>
              )}
            </Card>
          )}

          {/* ----------------------------------------------- categories --- */}
          {categories.length > 0 && (
            <Card className="p-6">
              <h2 className="display text-[19px]">Category breakdown</h2>
              <p className="mt-1.5 text-[13px] text-silver-dim">
                Ten mechanics categories. Anything the footage could not support is marked rather
                than scored.
              </p>
              <div className="mt-5">
                {categories.map((c) => (
                  <CategoryRow key={c.key} cat={c} />
                ))}
              </div>
            </Card>
          )}

          <List title="Strengths" items={row.strengths ?? []} tone="text-[#3ddc84]" />
          <List title="Areas to improve" items={row.improvement_areas ?? []} tone="text-amber" />
          <List title="Coaching recommendations" items={row.recommendations ?? []} tone="text-electric-glow" />

          {/* ------------------------------- your biggest opportunities --- */}
          {isComplete && categories.length > 0 && weakCategories.length === 0 && (
            <Card className="p-6">
              <h2 className="display text-[19px]">Your Biggest Opportunities</h2>
              <p className="mt-2 text-[14.5px] text-silver">
                Your shot is looking strong across the board. Keep building consistency and
                continue working through your training plan.
              </p>
            </Card>
          )}

          {isComplete && recommendations.length > 0 && (
            <Card className="p-6">
              <h2 className="display text-[19px]">Your Biggest Opportunities</h2>
              <p className="mt-1.5 text-[13.5px] text-silver-dim">
                Your analysis identified a few areas that could have the biggest impact on your
                shot.
              </p>
              <div className="mt-5 grid gap-5">
                {recommendations.map((rec) => (
                  <div
                    key={rec.resourceId}
                    className="border-t border-white/[.06] pt-5 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[15.5px] font-semibold text-white">
                        Improve Your {rec.categoryLabel}
                      </h3>
                      <span className={`display text-[18px] leading-none ${scoreClass(rec.score)}`}>
                        {rec.score}
                        <span className="text-[12px] text-silver-dim">/10</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] text-silver">
                      {rec.reason} Watch this training clip to work on it.
                    </p>
                    <div className="mt-3">
                      <Button
                        href={rec.locked ? `/upgrade?need=${rec.requiredTier}` : `/library/${rec.resourceId}`}
                        size="sm"
                        variant={rec.locked ? 'ghost' : 'primary'}
                      >
                        {rec.locked ? `Unlock — ${rec.title}` : 'Watch Training'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <DeleteAnalysis id={row.id} canRequestReview={!row.requested_review} />
        </div>

        {/* -------------------------------------------------- side rail --- */}
        <div className="grid content-start gap-6">
          {videoUrl && (
            <Card className="p-6">
              <h3 className="display text-[18px]">Your clip</h3>
              <SmartVideo
                src={videoUrl}
                fallbackLabel="clip"
                controls
                playsInline
                className="mt-4 aspect-video w-full rounded-xl border border-white/[.08] bg-black"
              />
              <p className="mt-3 text-[12.5px] text-silver-dim">
                Stored privately. This playback link is signed and expires — it is not a public URL.
              </p>
            </Card>
          )}

          {row.player_notes && (
            <Card className="p-6">
              <h3 className="display text-[18px]">Your note</h3>
              <p className="mt-3 text-[14.5px] text-silver">{row.player_notes}</p>
            </Card>
          )}

          {(row.footage_issues?.length ?? 0) > 0 && (
            <Card className="p-6">
              <h3 className="display text-[18px]">Footage limitations</h3>
              <p className="mt-2 text-[13px] text-silver-dim">
                What about this clip held the analysis back. Fixing these gets you more graded
                categories next time.
              </p>
              <ul className="mt-4 grid gap-2.5">
                {row.footage_issues!.map((issue, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] text-silver">
                    <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    {issue}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="display text-[18px]">How to read this</h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-silver-dim">
              This grades still frames the way a coach does stepping through film. It is not a
              biomechanics lab — it cannot measure joint angles, puck speed or force, and it will
              not pretend to.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-silver-dim">
              <span className="font-semibold text-silver">Observed</span> means it was visible in
              the frames. <span className="font-semibold text-silver">Inferred</span> means it was
              deduced from what is visible. Low confidence means treat it as a conversation starter
              with your coach, not a verdict.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
