'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { AuthState } from '@/app/(auth)/actions';

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-[10px] bg-electric px-8 py-4 text-[15px] font-bold text-white shadow-[0_8px_30px_rgba(10,132,255,.32)] transition-all hover:bg-electric-glow disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function AuthForm({
  action,
  label,
  pendingLabel,
  children,
}: {
  action: (prev: AuthState, fd: FormData) => Promise<AuthState>;
  label: string;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      {children}

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-rink-red/40 bg-rink-red/[.08] px-4 py-3 text-[13.5px] text-white"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-lg border border-[#3ddc84]/40 bg-[#3ddc84]/[.08] px-4 py-3 text-[13.5px] text-white"
        >
          {state.message}
        </p>
      )}

      <Submit label={label} pendingLabel={pendingLabel} />
    </form>
  );
}
