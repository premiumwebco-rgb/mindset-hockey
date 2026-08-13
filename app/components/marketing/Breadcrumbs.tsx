import Link from 'next/link';

export default function Breadcrumbs({ current }: { current: string }) {
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link href="/">Home</Link></li>
          <li><span aria-current="page">{current}</span></li>
        </ol>
      </nav>
    </div>
  );
}
