export default function Footer() {
  return (
    <div className="pt-12 border-t border-[var(--border)] mx-[var(--pad-page)]">
      <div className="flex justify-between items-start gap-8 flex-wrap">
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed max-w-[500px]">
          M&eacute;xico en Datos es un proyecto de datos abiertos. Toda la informaci&oacute;n
          proviene de fuentes oficiales del gobierno de M&eacute;xico. Los datos se actualizan
          conforme se publican nuevas cifras.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors text-sm">GitHub</a>
          <a href="#" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors text-sm">API</a>
          <a href="#" className="text-[var(--text-muted)] underline decoration-white/15 underline-offset-[2.5px] hover:text-[var(--accent)] hover:decoration-[var(--accent)] transition-colors text-sm">Metodolog&iacute;a</a>
        </div>
      </div>
    </div>
  );
}
