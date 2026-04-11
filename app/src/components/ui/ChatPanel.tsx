'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { useChatPanel } from './ChatProvider';
import Sparkline from '@/components/charts/Sparkline';
import HBar from '@/components/charts/HBar';
import TimeSeries from '@/components/charts/TimeSeries';
import Scatter from '@/components/charts/Scatter';
import DotStrip from '@/components/charts/DotStrip';

// ── Simple Markdown renderer ────────────────────────────────────────────

function renderMarkdown(text: string) {
  const blocks = text.split(/\n\n+/);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Table detection
    if (block.includes('|') && block.split('\n').length >= 2) {
      const lines = block.split('\n').filter((l) => l.trim());
      if (lines.length >= 2 && /^[\s|:-]+$/.test(lines[1])) {
        const headers = lines[0]
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        const rows = lines.slice(2).map((line) =>
          line
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean),
        );
        elements.push(
          <div key={i} className="overflow-x-auto my-2">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="text-left px-2 py-1.5 border-b border-[var(--border)] text-[var(--text-secondary)] font-medium"
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-2 py-1.5 border-b border-[var(--border)]/50 text-[var(--text-primary)]"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // Headers -- render as bold text
    const headerMatch = block.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) {
      elements.push(
        <p key={i} className="text-[13px] font-semibold text-[var(--text-primary)] mt-2 mb-1">
          {renderInline(headerMatch[1])}
        </p>,
      );
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(block)) {
      const items = block.split(/\n/).filter((l) => l.trim());
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-0.5 text-[13px] text-[var(--text-primary)] my-1">
          {items.map((item, li) => (
            <li key={li}>{renderInline(item.replace(/^[-*]\s+/, ''))}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(block)) {
      const items = block.split(/\n/).filter((l) => l.trim());
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-0.5 text-[13px] text-[var(--text-primary)] my-1">
          {items.map((item, li) => (
            <li key={li}>{renderInline(item.replace(/^\d+\.\s+/, ''))}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[13px] leading-relaxed text-[var(--text-primary)] my-1">
        {renderInline(block)}
      </p>,
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3] && match[4]) {
      const href = match[4];
      if (href.startsWith('/')) {
        parts.push(
          <Link
            key={match.index}
            href={href}
            className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 hover:decoration-[var(--accent)] transition-colors"
          >
            {match[3]}
          </Link>,
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 hover:decoration-[var(--accent)] transition-colors"
          >
            {match[3]}
          </a>,
        );
      }
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 bg-white/[0.06] rounded text-[12px] font-mono"
        >
          {match[5]}
        </code>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ── Chat panel component ────────────────────────────────────────────────

const SUGGESTIONS = [
  { emoji: '\u{1F4C8}', text: 'Evoluci\u00f3n de la inflaci\u00f3n' },
  { emoji: '\u{1F4BC}', text: 'Ingreso vs informalidad por sector' },
  { emoji: '\u{1F5FA}\uFE0F', text: 'Homicidios por estado' },
  { emoji: '\u{1F512}', text: 'Cifra negra vs confianza policial' },
  { emoji: '\u{1F480}', text: 'Principales causas de muerte' },
  { emoji: '\u{1F4B1}', text: 'Tipo de cambio' },
];

export default function ChatPanel() {
  const { isOpen, close, _registerSubmit, _pendingMessage, _clearPending } = useChatPanel();
  const { messages, sendMessage: chatSendMessage, status } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<(msg: string) => void>(undefined);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) close();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isLoading) return;
    chatSendMessage({ text: content.trim() });
    setInput('');
  }, [chatSendMessage, isLoading]);

  // Keep ref in sync for external callers
  sendMessageRef.current = sendMessage;

  // Register submit handler so Hero can send messages directly
  useEffect(() => {
    _registerSubmit((msg: string) => sendMessageRef.current?.(msg));
  }, [_registerSubmit]);

  // Process pending messages from Hero
  useEffect(() => {
    if (_pendingMessage && isOpen && !isLoading) {
      sendMessageRef.current?.(_pendingMessage);
      _clearPending();
    }
  }, [_pendingMessage, isOpen, isLoading, _clearPending]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Extract user text from message parts
  function getUserText(msg: { parts: Array<{ type: string; text?: string }> }): string {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={close}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[70] w-full max-w-[520px] bg-[#0a0a0a] border-l border-[var(--border)] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-[14px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--accent)]">
                <path
                  d="M12 3L14.5 8.5L20 9.27L16 13.14L16.94 18.63L12 16L7.06 18.63L8 13.14L4 9.27L9.5 8.5L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Asistente de datos
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Impulsado por IA
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-[14px] text-[var(--text-secondary)] mb-1">
                Pregunta sobre M&eacute;xico
              </p>
              <p className="text-[12px] text-[var(--text-muted)] mb-6">
                Datos oficiales con gr&aacute;ficas generadas por IA
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] bg-white/[0.04] border border-[var(--border)] rounded-full hover:bg-white/[0.08] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                  >
                    {s.emoji} {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[90%] rounded-xl px-3.5 py-2.5 bg-[var(--accent)]/15 text-[var(--text-primary)]">
                  <p className="text-[13px] leading-relaxed">{getUserText(msg)}</p>
                </div>
              ) : (
                <div className="max-w-[90%] flex flex-col gap-2">
                  {msg.parts.map((part, pi) => {
                    if (part.type === 'text' && part.text) {
                      return (
                        <div key={pi} className="rounded-xl px-3.5 py-2.5 bg-white/[0.04] text-[var(--text-primary)]">
                          <div className="chat-markdown">{renderMarkdown(part.text)}</div>
                        </div>
                      );
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dataPart = part as any;

                    if (dataPart.type === 'data-sparkline') {
                      const d = dataPart.data;
                      return (
                        <div key={pi} className="mt-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                            {d.label}
                          </div>
                          <Sparkline values={d.values} width={280} height={40} color={d.color} />
                        </div>
                      );
                    }

                    if (dataPart.type === 'data-hbar') {
                      const d = dataPart.data;
                      const fmt = d.valueFmt;
                      return (
                        <div key={pi} className="mt-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                          {d.title && (
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                              {d.title}
                            </div>
                          )}
                          <HBar
                            data={d.items}
                            valueFmt={fmt ? (v: number) => v.toFixed(1) + fmt : undefined}
                          />
                        </div>
                      );
                    }

                    if (dataPart.type === 'data-timeseries') {
                      const d = dataPart.data;
                      return (
                        <div key={pi} className="mt-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                            {d.label}
                          </div>
                          <TimeSeries
                            series={[{
                              values: d.values,
                              color: d.color || '#FF9F43',
                              label: d.label,
                            }]}
                            labels={d.labels}
                            periods={d.periods}
                            yUnit={d.yUnit || ''}
                            labelStep={Math.max(1, Math.floor(d.labels.length / 4))}
                          />
                        </div>
                      );
                    }

                    if (dataPart.type === 'data-scatter') {
                      const d = dataPart.data;
                      return (
                        <div key={pi} className="mt-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                          {d.title && (
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                              {d.title}
                            </div>
                          )}
                          <Scatter
                            points={d.points}
                            xLabel={d.xLabel}
                            yLabel={d.yLabel}
                            xUnit={d.xUnit}
                            yUnit={d.yUnit}
                            xDecimals={d.xDecimals}
                            yDecimals={d.yDecimals}
                          />
                        </div>
                      );
                    }

                    if (dataPart.type === 'data-dotstrip') {
                      const d = dataPart.data;
                      return (
                        <div key={pi} className="mt-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                          {d.title && (
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                              {d.title}
                            </div>
                          )}
                          <DotStrip points={d.points} unit={d.unit} />
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator: show until visible text appears */}
          {(() => {
            const lastMsg = messages[messages.length - 1];
            const hasVisibleText = lastMsg?.role === 'assistant' &&
              lastMsg.parts.some((p: { type: string; text?: string }) => p.type === 'text' && p.text);
            const showDots = status === 'submitted' || (status === 'streaming' && !hasVisibleText);
            if (!showDots) return null;
            return (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-[pulse_1s_ease-in-out_infinite]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                    </span>
                    Consultando datos...
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex justify-start">
              <div className="rounded-xl px-3.5 py-2.5 bg-white/[0.04] text-[var(--text-primary)]">
                <p className="text-[13px]">Lo siento, ocurri&oacute; un error al procesar tu consulta. Intenta de nuevo.</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 border-t border-[var(--border)]"
        >
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--accent)]/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--accent)] text-black disabled:opacity-30 transition-opacity cursor-pointer shrink-0"
              aria-label="Enviar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
            Datos de INEGI, Banxico, SESNSP y CONEVAL &middot; Puede cometer errores
          </p>
        </form>
      </div>
    </>
  );
}
