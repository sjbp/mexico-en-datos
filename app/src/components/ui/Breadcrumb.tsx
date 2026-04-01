import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-[6px] text-sm mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-[6px]">
          {i > 0 && <span className="text-[var(--text-muted)]">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text-secondary)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
