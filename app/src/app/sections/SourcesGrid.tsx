import Link from 'next/link';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';

interface SourceConfig {
  icon: string;
  name: string;
  desc: string;
  badge: string;
  href: string;
}

const SOURCES: SourceConfig[] = [
  {
    icon: '\ud83d\udcca',
    name: 'INEGI',
    desc: 'Instituto Nacional de Estadistica y Geografia',
    badge: '12 indicadores',
    href: '/fuentes/inegi',
  },
  {
    icon: '\ud83c\udfe6',
    name: 'Banxico',
    desc: 'Banco de Mexico',
    badge: 'Proximamente',
    href: '/fuentes/banxico',
  },
  {
    icon: '\ud83d\udcbc',
    name: 'IMSS',
    desc: 'Instituto Mexicano del Seguro Social',
    badge: 'Proximamente',
    href: '/fuentes/imss',
  },
  {
    icon: '\ud83d\udcc9',
    name: 'CONEVAL',
    desc: 'Consejo Nacional de Evaluacion',
    badge: 'Proximamente',
    href: '/fuentes/coneval',
  },
  {
    icon: '\ud83d\udc65',
    name: 'CONAPO',
    desc: 'Consejo Nacional de Poblacion',
    badge: 'Proximamente',
    href: '/fuentes/conapo',
  },
  {
    icon: '\ud83c\udfe5',
    name: 'Sec. Salud',
    desc: 'Secretaria de Salud',
    badge: 'Proximamente',
    href: '/fuentes/salud',
  },
];

export default function SourcesGrid() {
  return (
    <>
      <SectionHeader title="Fuentes de datos" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-6 gap-3 max-sm:grid-cols-2 sm:max-lg:grid-cols-3">
          {SOURCES.map((s) => (
            <Link
              key={s.name}
              href={s.href}
              className="block no-underline text-inherit h-full"
            >
              <Card interactive className="h-full flex flex-col">
                <div className="text-lg mb-2">{s.icon}</div>
                <div className="text-[14px] font-semibold text-white mb-1">{s.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] leading-normal mb-2 flex-1">
                  {s.desc}
                </div>
                <div className="inline-block text-[10px] mt-auto uppercase tracking-[0.06em] font-semibold px-2 py-[3px] rounded-full bg-[#1a1a1a] text-[var(--text-muted)] border border-[#2a2a2a]">
                  {s.badge}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
