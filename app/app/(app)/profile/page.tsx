import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { getPlayerProfile } from '@/lib/data';
import { PILLARS, type PlayLevel, type Position } from '@/lib/types';
import { Button, Card, EmptyState, PageHeading, PillarChip } from '@/components/ui';
import EditProfileForm from './EditProfileForm';

export const metadata = { title: 'Player Profile — Mindset Hockey' };

/** Player rows can change (Edit Profile), so this must never be cached. */
export const dynamic = 'force-dynamic';

const LEVEL_LABEL: Record<PlayLevel, string> = {
  house: 'House / Rec',
  a: 'A',
  aa: 'AA',
  aaa: 'AAA',
  prep: 'Prep',
  junior: 'Junior',
  college: 'College',
};

const POSITION_LABEL: Record<Position, string> = {
  forward: 'Forward',
  defense: 'Defence',
  goalie: 'Goaltender',
};

export default async function ProfilePage() {
  const session = await requireSession();
  const player = await getPlayerProfile(session);

  if (!player) {
    return (
      <>
        <PageHeading eyebrow="Player profile" title="Set up your player" />
        <EmptyState
          title="No player set up yet"
          body="Finish the three-step setup and this page fills in with your real hockey profile — level, position, stick flex, focus pillars and training days."
          action={<Button href="/onboarding">Set up your player</Button>}
        />
      </>
    );
  }

  const age = player.birthYear ? new Date().getFullYear() - player.birthYear : null;

  return (
    <>
      <PageHeading
        eyebrow="Player profile"
        title={player.firstName}
        sub="This is what the weekly plan, mindset lessons and training resources are built from."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        {/* IDENTITY — the hockey-card view. */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">
                {POSITION_LABEL[player.position]} · {LEVEL_LABEL[player.level]}
              </p>
              <h2 className="display text-2xl">{player.firstName}</h2>
              {player.teamName && <p className="mt-1 text-[13.5px] text-silver-dim">{player.teamName}</p>}
            </div>
            <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-silver-dim">
              Shoots {player.shoots}
            </span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[.08] pt-5">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">Age</dt>
              <dd className="mt-1 text-[16px] font-semibold text-white">{age ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">Stick flex</dt>
              <dd className="mt-1 text-[16px] font-semibold text-white">
                {player.stickFlex ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
                Training days
              </dt>
              <dd className="mt-1 text-[16px] font-semibold text-white">
                {player.trainingDaysGoal}/week
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">Level</dt>
              <dd className="mt-1 text-[16px] font-semibold text-white">{LEVEL_LABEL[player.level]}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-white/[.08] pt-5">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-silver-dim">
              Development pillars
            </p>
            {player.focusPillars.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {player.focusPillars.map((p) => (
                  <PillarChip key={p} pillar={p} />
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-silver-dim">None selected yet.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[.08] pt-5">
            <Button href="/dashboard" variant="ghost" size="sm">
              Your development overview
            </Button>
            <Link
              href="/library"
              className="inline-flex items-center text-[13px] font-semibold text-electric-glow hover:underline"
            >
              Browse content for your pillars →
            </Link>
          </div>
        </Card>

        {/* EDIT — same fields, same validation, same table as onboarding. */}
        <Card className="p-6">
          <h3 className="display mb-1 text-[18px]">Edit profile</h3>
          <p className="mb-5 text-[13.5px] text-silver-dim">
            Update anything here — it saves straight to your player record and the dashboard
            reflects it immediately.
          </p>
          <EditProfileForm
            initial={{
              firstName: player.firstName,
              birthYear: player.birthYear,
              level: player.level,
              position: player.position,
              shoots: player.shoots,
              stickFlex: player.stickFlex,
              focusPillars: player.focusPillars,
              trainingDaysGoal: player.trainingDaysGoal,
            }}
            pillars={PILLARS}
          />
        </Card>
      </div>
    </>
  );
}
