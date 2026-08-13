import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="Short version: we sell training content and coaching feedback. We do not sell outcomes, and we make it easy to leave."
      sections={[
        {
          heading: 'What you are buying',
          body: 'A subscription to training videos, drills, weekly plans and — on the Advanced tier — a set number of coach-reviewed video analyses each month. You are not buying tryout results, roster spots, scouting exposure, or placement at any level of hockey. Nobody can honestly sell you those.',
        },
        {
          heading: 'No performance guarantees',
          body: 'Individual results vary enormously and depend on the player, their coaching, their team, their health and a large amount of luck. Fewer than 0.11% of youth players reach the NHL. We will always tell you the truth about odds rather than sell you a dream.',
        },
        {
          heading: 'Billing and cancellation',
          body: 'Subscriptions renew automatically until you cancel. Cancel from your account page in two clicks at any time; access continues to the end of the period you have already paid for. Basic includes a 7-day free trial. Advanced carries a 14-day money-back guarantee — email us and we refund it without an interrogation.',
        },
        {
          heading: 'Accounts and minors',
          body: 'Accounts for players under 18 must be created and managed by a parent or legal guardian. The guardian is the account holder and is responsible for billing and for any content uploaded.',
        },
        {
          heading: 'Video you upload',
          body: 'You keep ownership of any video you submit. You grant us the limited right to store it, review it and produce feedback for you. We will never publish, market or share a player\'s footage without separate written consent from their parent or guardian.',
        },
        {
          heading: 'Content licence',
          body: 'Your membership is a personal, non-transferable licence to view the content. Please do not redistribute, resell or re-upload it. Team and association licences are available if you want to share it with a group — just ask.',
        },
        {
          heading: 'Safety',
          body: 'Training carries physical risk. Nothing here is medical advice. If your player is injured or in pain, see a doctor before continuing, and follow their guidance over ours.',
        },
      ]}
    />
  );
}
