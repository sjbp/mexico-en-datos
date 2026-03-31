'use client';

import { useState } from 'react';
import NavTabs from '@/components/ui/NavTabs';

const tabs = [
  { id: 'overview', label: 'Panorama' },
  { id: 'economia', label: 'Econom\u00eda' },
  { id: 'empleo', label: 'Empleo' },
  { id: 'salud', label: 'Salud' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'poblacion', label: 'Poblaci\u00f3n' },
];

export default function Hero() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <div className="pt-12 px-[var(--pad-page)] mb-8">
        <h1 className="text-[56px] font-bold tracking-[-0.04em] leading-[1.1] text-white max-sm:text-4xl">
          M&eacute;xico en Datos
        </h1>
        <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[680px] mb-4" style={{ textWrap: 'pretty' }}>
          Estad&iacute;sticas p&uacute;blicas de M&eacute;xico, accesibles para todos.
          Econom&iacute;a, empleo, salud, seguridad y demograf&iacute;a &mdash; visualizadas,
          actualizadas y consultables.
        </p>
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
          Fuentes:{' '}
          <a href="https://www.inegi.org.mx" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">INEGI</a>,{' '}
          <a href="https://www.gob.mx/salud" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">Secretar&iacute;a de Salud</a>,{' '}
          <a href="https://www.imss.gob.mx" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">IMSS</a>,{' '}
          <a href="https://www.gob.mx/conapo" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">CONAPO</a>,{' '}
          <a href="https://www.coneval.org.mx" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">CONEVAL</a>
        </p>
      </div>
      <NavTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}
