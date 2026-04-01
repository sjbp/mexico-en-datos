import Link from 'next/link';

export default function Hero() {
  return (
    <div className="pt-12 px-[var(--pad-page)] mb-8">
      <h1 className="text-[56px] font-bold tracking-[-0.04em] leading-[1.1] text-white max-sm:text-4xl">
        M&eacute;xico en Datos
      </h1>
      <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[680px] mb-6" style={{ textWrap: 'pretty' }}>
        Estad&iacute;sticas p&uacute;blicas de M&eacute;xico, accesibles para todos.
        Econom&iacute;a, empleo, salud, seguridad y demograf&iacute;a &mdash; visualizadas,
        actualizadas y consultables.
      </p>

      {/* AI CTA */}
      <Link
        href="/calendario"
        className="block max-w-[600px] no-underline group mb-3"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl transition-all group-hover:border-[var(--accent)]/40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--text-muted)] shrink-0">
            <path d="M12 3L14.5 8.5L20 9.27L16 13.14L16.94 18.63L12 16L7.06 18.63L8 13.14L4 9.27L9.5 8.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[14px] text-[var(--text-muted)]">
            Preg&uacute;ntale algo a los datos de M&eacute;xico...
          </span>
        </div>
      </Link>
      <p className="text-[11px] text-[var(--text-muted)] mb-6">
        Impulsado por IA &middot; Pr&oacute;ximamente
      </p>

      {/* Source attribution */}
      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
        Fuentes:{' '}
        <a href="https://www.inegi.org.mx" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">INEGI</a>,{' '}
        <a href="https://www.gob.mx/salud" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">Secretar&iacute;a de Salud</a>,{' '}
        <a href="https://www.imss.gob.mx" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">IMSS</a>,{' '}
        <a href="https://www.gob.mx/conapo" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">CONAPO</a>,{' '}
        <a href="https://www.coneval.org.mx" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors">CONEVAL</a>
      </p>
    </div>
  );
}
