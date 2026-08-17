import { NextResponse } from 'next/server';
import { requireStaff, DEMO_MODE } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET one recipe with all its child rows, for loading into the editor.
 *
 * Staff-only, and reads through the service-role client so a DRAFT is
 * loadable — the 0012 read policy would hide it from a session client that
 * belonged to a member. requireStaff() above is what makes that safe.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireStaff();
  if (DEMO_MODE) return NextResponse.json({ error: 'Demo mode.' }, { status: 503 });

  const { id } = await params;
  const admin = await createAdminClient();

  const { data: recipe, error } = await admin
    .from('nutrition_recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !recipe) {
    console.error('[nutrition-cms] load failed:', error?.message);
    return NextResponse.json({ error: 'Could not find that recipe.' }, { status: 404 });
  }

  const [{ data: ingredients }, { data: steps }, { data: tags }] = await Promise.all([
    admin
      .from('nutrition_recipe_ingredients')
      .select('name, quantity, unit, metric_note, optional, notes, sort_order')
      .eq('recipe_id', id)
      .order('sort_order', { ascending: true }),
    admin
      .from('nutrition_recipe_steps')
      .select('body, sort_order')
      .eq('recipe_id', id)
      .order('sort_order', { ascending: true }),
    admin.from('nutrition_recipe_tags').select('tag').eq('recipe_id', id),
  ]);

  return NextResponse.json({
    recipe,
    ingredients: ingredients ?? [],
    steps: steps ?? [],
    tags: (tags ?? []).map((t) => (t as { tag: string }).tag),
  });
}
