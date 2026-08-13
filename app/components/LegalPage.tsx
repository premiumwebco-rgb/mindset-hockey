import Link from 'next/link';

export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-16">
      <Link href="/" className="mb-10 flex flex-col leading-[.85]">
        <b className="display text-[20px]">MINDSET</b>
        <span className="pl-px text-[9px] font-semibold tracking-[.42em] text-silver-dim">
          HOCKEY
        </span>
      </Link>

      <h1 className="display text-[clamp(28px,5vw,44px)]">{title}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-silver">{intro}</p>

      <div className="mt-10 grid gap-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="display text-[20px]">{s.heading}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-silver-dim">{s.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-white/[.08] pt-6 text-[13px] text-silver-dim">
        This is a plain-language placeholder written to be honest and readable. Have a lawyer in
        your jurisdiction review it before you take payments — particularly the sections covering
        minors, refunds and video consent.
      </p>
    </div>
  );
}
