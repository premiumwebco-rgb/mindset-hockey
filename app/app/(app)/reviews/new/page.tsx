import { requireFeature } from '@/lib/session';
import { Card, Eyebrow } from '@/components/ui';
import SubmissionForm from './SubmissionForm';

export const metadata = { title: 'Submit Footage — Mindset Hockey' };

export default async function NewSubmissionPage() {
  await requireFeature('video_review');

  return (
    <div>
      <Eyebrow>Coach Review</Eyebrow>
      <h1 className="display text-[clamp(28px,5vw,44px)]">Submit footage</h1>
      <p className="mt-3 max-w-[60ch] text-[16px] text-silver">
        Game film, practice or training. Tell us what you want looked at and a named coach comes
        back with written notes.
      </p>

      <div className="mt-8">
        <SubmissionForm />
      </div>

      <Card className="mt-6 border-l-2 border-electric p-5 text-[14px] text-silver-dim">
        <b className="text-white">What makes a useful submission:</b> one period rather than a
        whole game, a note naming the shifts you want looked at, and the jersey number so the
        coach is watching the right player.
      </Card>
    </div>
  );
}
