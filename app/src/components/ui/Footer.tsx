import Link from 'next/link';

const linkClass = 'text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors text-sm';

export default function Footer() {
  return (
    <div className="pt-12 border-t border-[var(--border)] mx-[var(--pad-page)]">
      <div className="flex justify-between items-start gap-8 flex-wrap">
        <div className="max-w-[500px]">
          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-3">
            M&eacute;xico en Datos es un proyecto independiente de datos abiertos.
            Toda la informaci&oacute;n proviene de fuentes oficiales del gobierno de M&eacute;xico.
          </p>
          <p className="text-[12px] text-[var(--text-muted)]/60">
            Hecho por{' '}
            <a href="https://www.linkedin.com/in/sebastianjbp/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              Sebasti&aacute;n
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-6">
            <a href="https://github.com/sjbp/mexico-en-datos" target="_blank" rel="noopener noreferrer" className={linkClass}>GitHub</a>
            <a href="https://github.com/sjbp/mexico-en-datos/issues/new?labels=bug&template=bug_report.md&title=%5BBug%5D+" target="_blank" rel="noopener noreferrer" className={linkClass}>Reportar error</a>
            <Link href="/preguntas-frecuentes" className={linkClass}>FAQ</Link>
          </div>
          <a
            href="https://buymeacoffee.com/datamx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--accent)] hover:brightness-125 transition-all mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
            </svg>
            Apoyar este proyecto
          </a>
        </div>
      </div>
    </div>
  );
}
