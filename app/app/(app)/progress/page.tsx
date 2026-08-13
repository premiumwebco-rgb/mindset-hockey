import { requireFeature, canUse } from '@/lib/session';
import { getMetrics } from '@/lib/data';
import { Card, Eyebrow, Stat, EmptyState } from '@/components/ui';
import TrendChart from '@/components/TrendChart';

export const metadata = { title: 'Progress — Mindset Hockey' };

const KIND_LABEL: Record<string, string> = {
  analysis_score: 'Shot analysis score',
  shot_mph: 'Shot speed',
  squat_1rm: 'Squat 1RM',
  sprint_10y: '10-yard sprint',
};

export default async function ProgressPage() {
  const session = await requireFeature('basic_tracking');
  const metrics = await getMetrics(session);
  const advanced = canUse(session, 'advanced_tracking');

  const byKind = new Map<string, { recorded_at: string; value: number; unit: string | null }[]>();
  for (const m of metrics) {
    if (!byKind.has(m.kind)) byKind.set(m.kind, []);
    byKind.get(m.kind)!.push({ recorded_at: m.recorded_at, value: m.value, unit: m.unit });
  }

  // Basic tier sees the headline number only; Premium sees full trends.
  const kinds = [...byKind.entries()];

  return (
    <div>
      <Eyebrow>Development</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Progress</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] text-silver">
        Every analysis score, session and personal record in one place — so improvement is a
        number you can point at, not a feeling.
      </p>

      {kinds.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No data yet"
            body="Your first shot analysis will start the chart. Log a lift or a shot-speed reading to add more."
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kinds.map(([kind, points]) => {
              const latest = points[points.length - 1];
              const first = points[0];
              const delta = latest.value - first.value;
              return (
                <Stat
                  key={kind}
                  label={KIND_LABEL[kind] ?? kind}
                  value={`${Math.round(latest.value * 10) / 10}${latest.unit ? ` ${latest.unit}` : ''}`}
                  sub={
                    points.length > 1
                      ? `${delta >= 0 ? '+' : ''}${Math.round(delta * 10) / 10} since first entry`
                      : 'First entry'
                  }
                />
              );
            })}
          </div>

          {advanced ? (
            <div className="mt-8 grid gap-5">
              {kinds.map(([kind, points]) => (
                <Card key={kind} className="p-6">
                  <h3 className="display text-[19px]">{KIND_LABEL[kind] ?? kind}</h3>
                  <div className="mt-4">
                    <TrendChart
                      points={points.map((p) => ({ x: p.recorded_at, y: p.value }))}
                      unit={points[0].unit ?? ''}
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-8 border-electric/30 bg-electric/[.05] p-6">
              <h3 className="display text-[19px]">Trend charts are a Premium feature</h3>
              <p className="mt-2 text-[15px] text-silver-dim">
                Premium adds full trend lines, comparison against previous uploads and milestone
                tracking, alongside AI shot analysis and the workout, nutrition and mindset systems.
              </p>
              <a
                href="/upgrade?need=premium"
                className="mt-4 inline-flex rounded-[10px] bg-electric px-6 py-3 text-[14px] font-bold text-white"
              >
                See Premium
              </a>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
