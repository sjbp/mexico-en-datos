'use client';

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useChatPanel } from './ChatProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Simple Markdown renderer ────────────────────────────────────────────

function renderMarkdown(text: string) {
  // Split into blocks by double newlines
  const blocks = text.split(/\n\n+/);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Table detection
    if (block.includes('|') && block.split('\n').length >= 2) {
      const lines = block.split('\n').filter((l) => l.trim());
      // Check if second line is a separator
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

    // Headers
    const headerMatch = block.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const sizes = ['text-[16px] font-semibold', 'text-[15px] font-semibold', 'text-[14px] font-medium'];
      elements.push(
        <p key={i} className={`${sizes[level - 1]} text-[var(--text-primary)] mt-3 mb-1`}>
          {renderInline(headerMatch[2])}
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
  // Process inline markdown: bold, links, inline code
  const parts: React.ReactNode[] = [];
  // Regex for: **bold**, [text](url), `code`
  const regex = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3] && match[4]) {
      // Link
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
      // Inline code
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

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ── Chat panel component ────────────────────────────────────────────────

const SUGGESTIONS = [
  '¿Cuál es la inflación actual?',
  '¿Qué estados tienen más homicidios?',
  '¿Cuáles son las principales causas de muerte?',
  'Compara informalidad por sector económico',
];

export default function ChatPanel() {
  const { isOpen, close } = useChatPanel();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, ocurrió un error al procesar tu consulta. Intenta de nuevo.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

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
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-[14px] text-[var(--text-secondary)] mb-1">
                Pregunta lo que quieras sobre los datos de M&eacute;xico
              </p>
              <p className="text-[12px] text-[var(--text-muted)] mb-6">
                Econom&iacute;a, empleo, seguridad, salud y m&aacute;s
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] bg-white/[0.04] border border-[var(--border)] rounded-full hover:bg-white/[0.08] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)]/15 text-[var(--text-primary)]'
                    : 'bg-white/[0.04] text-[var(--text-primary)]'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-[13px] leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="chat-markdown">{renderMarkdown(msg.content)}</div>
                )}
              </div>
            </div>
          ))}

          {loading && (
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
              disabled={loading}
              className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
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
