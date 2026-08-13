'use client';

import { useFormStatus } from 'react-dom';
import { signOutAction } from '@/app/(auth)/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[13px] text-silver-dim transition-colors hover:text-white disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Btn />
    </form>
  );
}
