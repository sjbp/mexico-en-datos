import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';

const TOPIC_META: Record<string, { icon: string; desc: string; slug: string }> = {
  prices: {
    icon: '\ud83d\udcc8',
    slug: 'prices',
    desc: 'Indices de precios al consumidor y al productor. Incluye INPC general, subyacente y por categoria.',
  },
  economic_activity: {
    icon: '\ud83c\udfe6',
    slug: 'economic_activity',
    desc: 'Producto Interno Bruto, Indicador Global de la Actividad Economica y estimaciones oportunas.',
  },
  employment: {
    icon: '\ud83d\udcbc',
    slug: 'employment',
    desc: 'Indicadores principales de la Encuesta Nacional de Ocupacion y Empleo: desempleo, informalidad, subocupacion.',
  },
};

interface TopicsGridProps {
  topics: { topic: string; count: number }[];
}

export default function TopicsGrid({ topics }: TopicsGridProps) {
  if (topics.length === 0) {
    return null;
  }

  return (
    <>
      <SectionHeader title="Explora por tema" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 px-[var(--pad-page)] mb-12 max-sm:grid-cols-1">
        {topics.map((t) => {
          const meta = TOPIC_META[t.topic];
          const icon = meta?.icon ?? '\ud83d\udcca';
          const desc = meta?.desc ?? `${t.count} indicadores disponibles en este tema.`;
          const displayName = t.topic
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <a
              key={t.topic}
              href={`/explorador?topic=${encodeURIComponent(t.topic)}`}
              className="block no-underline text-inherit"
            >
              <Card interactive>
                <div className="text-xl mb-[10px]">{icon}</div>
                <div className="text-[15px] font-semibold text-white mb-[6px]">{displayName}</div>
                <div className="text-[13px] text-[var(--text-secondary)] leading-normal mb-3">
                  {desc}
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-base font-bold tracking-tight text-[var(--accent)] tabular-nums">
                      {t.count}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] mt-[2px]">
                      indicadores
                    </div>
                  </div>
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </>
  );
}
