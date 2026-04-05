import Link from 'next/link';

interface TopicConfig {
  icon: string;
  name: string;
  desc: string;
  href: string;
  highlight?: string;  // A compelling stat or fact
  color: string;       // Accent color for visual variety
}

const TOPICS: TopicConfig[] = [
  {
    icon: '\ud83d\udcc8',
    name: 'Economia',
    desc: 'PIB, inflacion, IGAE, tipo de cambio, confianza del consumidor y balanza comercial.',
    href: '/economia',
    highlight: '21 indicadores en tiempo real',
    color: '#FF9F43',
  },
  {
    icon: '\ud83d\udcbc',
    name: 'Empleo',
    desc: 'La tasa de desempleo en Mexico es baja, pero el 58% de los trabajadores son informales.',
    href: '/empleo',
    highlight: '58% informalidad',
    color: '#60A5FA',
  },
  {
    icon: '\ud83d\udd12',
    name: 'Seguridad',
    desc: 'El 90% de los delitos no se denuncian. Homicidios, victimizacion y confianza institucional.',
    href: '/seguridad',
    highlight: '90% cifra negra',
    color: '#EF4444',
  },
  {
    icon: '\ud83c\udfe5',
    name: 'Salud',
    desc: 'Enfermedades del corazon y diabetes son las principales causas de muerte. 39% sin cobertura de salud.',
    href: '/salud',
    highlight: '800K defunciones analizadas',
    color: '#22C55E',
  },
  {
    icon: '\ud83c\udfed',
    name: 'Comercio',
    desc: 'Mexico es el principal socio comercial de EE.UU. Exportaciones, importaciones y nearshoring.',
    href: '/comercio',
    highlight: '$50B+ USD/mes en comercio',
    color: '#A592D5',
  },
];

export default function TopicsGrid() {
  const [featured, ...rest] = TOPICS;

  return (
    <div className="px-[var(--pad-page)] mb-12">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">
          Explora por tema
        </h2>
        <p className="text-[13px] text-[var(--text-muted)]">
          Datos detallados, visualizaciones y contexto para entender M&eacute;xico.
        </p>
      </div>

      {/* Featured topic (large) + grid of rest */}
      <div className="grid grid-cols-[1fr_1fr] gap-3 max-sm:grid-cols-1 mb-3">
        {/* Featured — tall card with accent border */}
        <Link
          href={featured.href}
          className="block no-underline text-inherit group"
        >
          <div
            className="h-full rounded-xl p-6 transition-all duration-200 group-hover:brightness-110"
            style={{
              background: `linear-gradient(135deg, ${featured.color}12 0%, ${featured.color}04 100%)`,
              border: `1px solid ${featured.color}25`,
            }}
          >
            <span className="text-2xl">{featured.icon}</span>
            <h3 className="text-xl font-bold text-white mt-3 mb-2">{featured.name}</h3>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">
              {featured.desc}
            </p>
            <span
              className="inline-block text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ background: `${featured.color}20`, color: featured.color }}
            >
              {featured.highlight}
            </span>
          </div>
        </Link>

        {/* 2x2 grid of smaller topics */}
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {rest.map((t) => (
            <Link
              key={t.name}
              href={t.href}
              className="block no-underline text-inherit group"
            >
              <div
                className="h-full rounded-xl p-4 transition-all duration-200 group-hover:brightness-110"
                style={{
                  background: `linear-gradient(135deg, ${t.color}08 0%, transparent 100%)`,
                  border: `1px solid ${t.color}18`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{t.icon}</span>
                  <span className="text-[14px] font-semibold text-white">{t.name}</span>
                </div>
                <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mb-3">
                  {t.desc}
                </p>
                <span
                  className="inline-block text-[10px] font-semibold px-2 py-[2px] rounded-full"
                  style={{ background: `${t.color}18`, color: t.color }}
                >
                  {t.highlight}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
