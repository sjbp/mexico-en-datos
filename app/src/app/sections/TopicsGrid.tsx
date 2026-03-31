import Link from 'next/link';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';

interface TopicConfig {
  icon: string;
  name: string;
  desc: string;
  href: string;
  stats: { value: string; label: string }[];
}

const TOPICS: TopicConfig[] = [
  {
    icon: '\ud83d\udcc8',
    name: 'Economía',
    desc: 'PIB, inflación, actividad económica, confianza empresarial y del consumidor, balanza comercial.',
    href: '/explorador?topic=prices',
    stats: [{ value: '22', label: 'indicadores' }, { value: 'Quincenal', label: 'actualización' }],
  },
  {
    icon: '\ud83d\udcbc',
    name: 'Empleo',
    desc: 'Ocupación, desempleo, informalidad, salarios, sectores, calidad del empleo por estado y ocupación.',
    href: '/empleo',
    stats: [{ value: '457', label: 'ocupaciones' }, { value: 'Trimestral', label: 'ENOE' }],
  },
  {
    icon: '\ud83c\udfe5',
    name: 'Salud',
    desc: 'Mortalidad, cobertura de salud, infraestructura hospitalaria, gasto en salud, causas de muerte.',
    href: '/salud',
    stats: [{ value: '6', label: 'fuentes' }, { value: '20+', label: 'años de datos' }],
  },
  {
    icon: '\ud83d\udd12',
    name: 'Seguridad',
    desc: 'Victimización, cifra negra, percepción de inseguridad, tipos de delito por estado y ciudad.',
    href: '/seguridad',
    stats: [{ value: '32', label: 'estados' }, { value: 'Trimestral', label: 'ENSU' }],
  },
  {
    icon: '\ud83d\udcb0',
    name: 'Ingresos y pobreza',
    desc: 'Distribución del ingreso, gasto de los hogares, pobreza multidimensional, desigualdad.',
    href: '/calendario',
    stats: [{ value: '9', label: 'ediciones ENIGH' }, { value: 'Próximamente', label: '' }],
  },
  {
    icon: '\ud83d\udc65',
    name: 'Población',
    desc: 'Demografía, migración, vivienda, pirámides de edad, estructura poblacional por municipio.',
    href: '/calendario',
    stats: [{ value: '2,469', label: 'municipios' }, { value: 'Próximamente', label: '' }],
  },
];

interface TopicsGridProps {
  topics: { topic: string; count: number }[];
}

export default function TopicsGrid({ topics: _topics }: TopicsGridProps) {
  return (
    <>
      <SectionHeader title="Explora por tema" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 px-[var(--pad-page)] mb-12 max-sm:grid-cols-1">
        {TOPICS.map((t) => (
          <Link
            key={t.name}
            href={t.href}
            className="block no-underline text-inherit"
          >
            <Card interactive>
              <div className="text-xl mb-[10px]">{t.icon}</div>
              <div className="text-[15px] font-semibold text-white mb-[6px]">{t.name}</div>
              <div className="text-[13px] text-[var(--text-secondary)] leading-normal mb-3">
                {t.desc}
              </div>
              <div className="flex gap-4">
                {t.stats.map((s, i) => (
                  <div key={i}>
                    <div className="text-base font-bold tracking-tight text-[var(--accent)] tabular-nums">
                      {s.value}
                    </div>
                    {s.label && (
                      <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] mt-[2px]">
                        {s.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
