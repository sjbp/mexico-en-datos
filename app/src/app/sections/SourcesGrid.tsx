import Link from 'next/link';
import Card from '@/components/ui/Card';

interface SourceConfig {
  icon: string;
  name: string;
  desc: string;
  badge: string;
  active: boolean;
  href: string;
}

const SOURCES: SourceConfig[] = [
  {
    icon: '\ud83d\udcca',
    name: 'INEGI',
    desc: 'Indicadores economicos, empleo, actividad productiva',
    badge: '14 series',
    active: true,
    href: '/fuentes/inegi',
  },
  {
    icon: '\ud83c\udfe6',
    name: 'Banxico',
    desc: 'Inflacion, tipo de cambio, tasa de interes',
    badge: '5 series',
    active: true,
    href: '/fuentes/banxico',
  },
  {
    icon: '\ud83d\udee1\ufe0f',
    name: 'SESNSP',
    desc: 'Homicidios y delitos por estado',
    badge: '2 series',
    active: true,
    href: '/seguridad',
  },
  {
    icon: '\ud83d\udcbc',
    name: 'ENOE',
    desc: 'Microdatos de empleo, informalidad, salarios',
    badge: '4 trimestres',
    active: true,
    href: '/empleo',
  },
  {
    icon: '\ud83d\udd12',
    name: 'ENVIPE',
    desc: 'Victimizacion, cifra negra, confianza institucional',
    badge: '3 anos',
    active: true,
    href: '/seguridad',
  },
  {
    icon: '\ud83c\udfe5',
    name: 'Sec. Salud',
    desc: 'Mortalidad, causas de muerte (CIE-10)',
    badge: '800K registros',
    active: true,
    href: '/salud',
  },
];

export default function SourcesGrid() {
  return (
    <div className="px-[var(--pad-page)] mb-12">
      {/* Compact inline header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            Fuentes oficiales
          </h2>
        </div>
        <Link
          href="/fuentes"
          className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors no-underline"
        >
          Ver todas &rarr;
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-6 sm:overflow-visible">
        {SOURCES.map((s) => (
          <Link
            key={s.name}
            href={s.href}
            className="block no-underline text-inherit shrink-0 w-[140px] sm:w-auto"
          >
            <Card interactive className="h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{s.icon}</span>
                <span className="text-[13px] font-semibold text-white">{s.name}</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] leading-snug mb-2">
                {s.desc}
              </div>
              <span className={`inline-block text-[10px] font-semibold px-2 py-[2px] rounded-full ${
                s.active
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'bg-[#1a1a1a] text-[var(--text-muted)] border border-[#2a2a2a]'
              }`}>
                {s.badge}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
