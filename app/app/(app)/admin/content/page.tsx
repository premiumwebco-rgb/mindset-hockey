import { requireAdmin, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, Eyebrow } from '@/components/ui';

export const metadata = { title: 'Content — Admin' };

async function counts() {
  if (DEMO_MODE) return { workout_plans: 4, meal_plans: 3, mindset_lessons: 8, nutrition_resources: 6 };
  const admin = await createAdminClient();
  const tables = ['workout_plans', 'meal_plans', 'mindset_lessons', 'nutrition_resources'] as const;
  const out: Record<string, number> = {};
  await Promise.all(
    tables.map(async (t) => {
      const { count } = await admin.from(t).select('*', { count: 'exact', head: true });
      out[t] = count ?? 0;
    })
  );
  return out;
}

export default async function AdminContentPage() {
  await requireAdmin();
  const c = await counts();

  const items = [
    { key: 'workout_plans', title: 'Workout plans', body: 'Strength, power, speed, mobility and recovery blocks.' },
    { key: 'meal_plans', title: 'Meal plans', body: 'Performance, lean mass and recovery nutrition.' },
    { key: 'mindset_lessons', title: 'Mindset lessons', body: 'Weekly lessons with exercises and reflection prompts.' },
    { key: 'nutrition_resources', title: 'Nutrition guides', body: 'Hydration, game-day and recovery guidance.' },
  ];

  return (
    <div>
      <Eyebrow>Admin</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Content</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <Card key={i.key} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="display text-[19px]">{i.title}</h3>
                <p className="mt-2 text-[14.5px] text-silver-dim">{i.body}</p>
              </div>
              <b className="display text-[30px] text-electric-glow">{c[i.key] ?? 0}</b>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 border-l-2 border-electric p-6">
        <h3 className="display text-[18px]">Authoring</h3>
        <p className="mt-2 text-[14.5px] text-silver-dim">
          Content rows are managed in the Supabase table editor for now — that keeps the surface
          area small while the library is still being written. Set{' '}
          <code className="rounded bg-ink px-1.5 py-0.5 text-[13px] text-white">is_published</code>{' '}
          to true to make a row visible to members, and{' '}
          <code className="rounded bg-ink px-1.5 py-0.5 text-[13px] text-white">required_tier</code>{' '}
          to control which plan can see it. A full authoring UI is worth building once the
          library stops changing shape weekly.
        </p>
      </Card>
    </div>
  );
}
