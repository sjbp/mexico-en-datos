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
    name: 'Economia',
    desc: 'PIB, inflacion, actividad economica, confianza, balanza comercial.',
    href: '/explorador',
    stats: [{ value: '22', label: 'indicadores' }, { value: 'Quincenal', label: 'actualizacion' }],
  },
  {
    icon: '\ud83d\udcbc',
    name: 'Empleo',
    desc: 'Desempleo, informalidad, salarios, sectores, calidad del empleo.',
    href: '/empleo',
    stats: [{ value: '457', label: 'ocupaciones' }, { value: 'Trimestral', label: 'ENOE' }],
  },
  {
    icon: '\ud83c\udfe5',
    name: 'Salud',
    desc: 'Mortalidad, cobertura, infraestructura, causas de muerte.',
    href: '/salud',
    stats: [{ value: '6', label: 'fuentes' }, { value: '20+', label: 'anos de datos' }],
  },
  {
    icon: '\ud83d\udd12',
    name: 'Seguridad',
    desc: 'Victimizacion, cifra negra, percepcion de inseguridad.',
    href: '/seguridad',
    stats: [{ value: '32', label: 'estados' }, { value: 'Trimestral', label: 'ENSU' }],
  },
  {
    icon: '\ud83c\udf93',
    name: 'Educacion',
    desc: 'Matricula, desercion, calidad educativa, cobertura.',
    href: '/educacion',
    stats: [{ value: '32', label: 'estados' }, { value: 'Proximamente', label: '' }],
  },
  {
    icon: '\ud83d\udcb0',
    name: 'Ingresos y Pobreza',
    desc: 'Distribucion del ingreso, pobreza, desigualdad.',
    href: '/ingresos',
    stats: [{ value: '9', label: 'ediciones ENIGH' }, { value: 'Proximamente', label: '' }],
  },
  {
    icon: '\ud83c\udfed',
    name: 'Comercio y Manufactura',
    desc: 'Exportaciones, nearshoring, industria, IED.',
    href: '/comercio',
    stats: [{ value: 'Mensual', label: 'actualizacion' }, { value: 'Proximamente', label: '' }],
  },
  {
    icon: '\ud83d\udc65',
    name: 'Poblacion',
    desc: 'Demografia, censo, migracion, vivienda.',
    href: '/poblacion',
    stats: [{ value: '2,469', label: 'municipios' }, { value: 'Proximamente', label: '' }],
  },
];

export default function TopicsGrid() {
  return (
    <>
      <SectionHeader title="Explora por tema" />
      <div className="grid grid-cols-4 gap-3 px-[var(--pad-page)] mb-12 max-sm:grid-cols-1 sm:max-lg:grid-cols-2">
        {TOPICS.map((t) => (
          <Link
            key={t.name}
            href={t.href}
            className="block no-underline text-inherit h-full"
          >
            <Card interactive className="h-full flex flex-col">
              <div className="text-xl mb-[10px]">{t.icon}</div>
              <div className="text-[15px] font-semibold text-white mb-[6px]">{t.name}</div>
              <div className="text-[13px] text-[var(--text-secondary)] leading-normal mb-3 flex-1">
                {t.desc}
              </div>
              <div className="flex gap-4 mt-auto">
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
