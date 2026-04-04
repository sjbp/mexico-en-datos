'use client';

import { useState, type KeyboardEvent } from 'react';
import { useChatPanel } from '@/components/ui/ChatProvider';

export default function Hero() {
  const { open, sendMessage } = useChatPanel();
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) {
      open();
      return;
    }
    sendMessage?.(q);
    setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="pt-16 pb-4 px-[var(--pad-page)] mb-6">
      {/* Bold AI-first headline */}
      <h1 className="text-[44px] font-bold tracking-[-0.03em] leading-[1.15] text-white max-sm:text-3xl mb-3 max-w-[700px]">
        ¿Qu&eacute; quieres saber sobre M&eacute;xico?
      </h1>
      <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[600px] mb-8" style={{ textWrap: 'pretty' }}>
        Pregunta lo que sea sobre la econom&iacute;a, empleo, seguridad o salud de M&eacute;xico.
        La IA consulta datos oficiales de INEGI, Banxico y m&aacute;s.
      </p>

      {/* AI Input — Hex-inspired */}
      <div className="max-w-[640px] mb-6">
        <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl transition-all focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_0_20px_rgba(255,159,67,0.08)]">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="¿Cu&aacute;l es la inflaci&oacute;n actual? ¿Qu&eacute; tan seguro es Quer&eacute;taro? ¿De qu&eacute; muere la gente?"
            rows={2}
            className="w-full bg-transparent text-[15px] text-white placeholder:text-[var(--text-muted)] px-5 pt-4 pb-2 resize-none outline-none"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-dim)] px-2.5 py-1 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L14.5 8.5L20 9.27L16 13.14L16.94 18.63L12 16L7.06 18.63L8 13.14L4 9.27L9.5 8.5L12 3Z" />
                </svg>
                IA
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Datos en tiempo real de fuentes oficiales
              </span>
            </div>
            <button
              onClick={handleSubmit}
              className="p-2 rounded-lg bg-[var(--accent)] text-black hover:brightness-110 transition-all"
              aria-label="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Quick suggestion pills */}
      <div className="flex flex-wrap gap-2 max-w-[640px] mb-8">
        {[
          '¿Cuál es la inflación actual?',
          'Estado más violento',
          'Causas de muerte',
          'Informalidad por sector',
        ].map((q) => (
          <button
            key={q}
            onClick={() => { sendMessage?.(q); }}
            className="text-[12px] text-[var(--text-muted)] border border-[var(--border)] rounded-full px-3 py-1.5 hover:border-[var(--accent)]/40 hover:text-[var(--text-secondary)] transition-all cursor-pointer bg-transparent"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
