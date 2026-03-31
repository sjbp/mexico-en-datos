import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  linkText?: string;
  linkHref?: string;
}

export default function SectionHeader({ title, linkText, linkHref }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline gap-3 px-[var(--pad-page)] mb-5">
      <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">{title}</h2>
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="text-[var(--text-muted)] text-sm underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors"
        >
          {linkText} &rarr;
        </Link>
      )}
    </div>
  );
}
