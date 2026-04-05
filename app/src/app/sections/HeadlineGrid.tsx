import Link from 'next/link';
import StatCard from '@/components/ui/StatCard';
import type { HeadlineResult } from '@/lib/data';

interface HeadlineGridProps {
  headlines: HeadlineResult[];
}

export default function HeadlineGrid({ headlines }: HeadlineGridProps) {
  if (headlines.length === 0) {
    return null;
  }

  return (
    <div className="px-[var(--pad-page)] mb-12">
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">
          Pulso de M&eacute;xico
        </h2>
        <p className="text-[13px] text-[var(--text-muted)]">
          Los indicadores m&aacute;s importantes del pa&iacute;s, actualizados desde fuentes oficiales.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
        {headlines.map((h) => (
          <Link
            key={h.id}
            href={h.href}
            className="block no-underline text-inherit h-full"
          >
            <StatCard
              label={h.label}
              value={h.value}
              change={h.change}
              changePeriod={h.changePeriod}
              sub={h.sub}
              sparkValues={h.sparkValues}
              isGoodDown={h.isGoodDown}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
