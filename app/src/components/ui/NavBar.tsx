'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useChatPanel } from './ChatProvider';

const topics = [
  { emoji: '📈', label: 'Economía', desc: 'PIB, inflación y actividad económica', href: '/economia' },
  { emoji: '💼', label: 'Empleo', desc: 'Ocupación, desempleo e informalidad', href: '/empleo' },
  { emoji: '🏥', label: 'Salud', desc: 'Mortalidad, cobertura e infraestructura', href: '/salud' },
  { emoji: '🔒', label: 'Seguridad', desc: 'Incidencia delictiva y percepción', href: '/seguridad' },
  { emoji: '🏭', label: 'Comercio y Manufactura', desc: 'Producción industrial y comercio', href: '/comercio' },
];

const navItems = [
  { label: 'Panorama', href: '/' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [temasOpen, setTemasOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const temasRef = useRef<HTMLDivElement>(null);
  const { open: openChat } = useChatPanel();

  // Close temas dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (temasRef.current && !temasRef.current.contains(e.target as Node)) {
        setTemasOpen(false);
      }
    }
    if (temasOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [temasOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setTemasOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-[var(--border)]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div
        className="flex items-center justify-between h-14 px-[var(--pad-page)]"
        style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}
      >
        {/* Logo */}
        <Link href="/" className="text-white font-bold text-[15px] no-underline shrink-0">
          México en Datos
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 ml-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 text-[13px] rounded-md no-underline transition-colors ${
                isActive(item.href)
                  ? 'text-white bg-white/[0.08]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Temas dropdown */}
          <div ref={temasRef} className="relative" onMouseLeave={() => setTemasOpen(false)}>
            <button
              onClick={() => setTemasOpen(!temasOpen)}
              onMouseEnter={() => setTemasOpen(true)}
              className={`px-3 py-1.5 text-[13px] rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                temasOpen || topics.some((t) => isActive(t.href))
                  ? 'text-white bg-white/[0.08]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]'
              }`}
            >
              Temas
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${temasOpen ? 'rotate-180' : ''}`}>
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {temasOpen && (
              <div className="absolute top-full left-0 mt-1 w-[520px] bg-[#141414] border border-[var(--border)] rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-1">
                {topics.map((topic) => (
                  <Link
                    key={topic.href}
                    href={topic.href}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors ${
                      isActive(topic.href)
                        ? 'bg-white/[0.08] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span className="text-base mt-0.5">{topic.emoji}</span>
                    <div>
                      <div className="text-[13px] font-medium">{topic.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">{topic.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/fuentes"
            className={`px-3 py-1.5 text-[13px] rounded-md no-underline transition-colors ${
              isActive('/fuentes')
                ? 'text-white bg-white/[0.08]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}
          >
            Fuentes
          </Link>
        </div>

        {/* Right side: AI CTA (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-3">
          <button
            onClick={openChat}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 text-[12px] font-medium text-[var(--accent)] bg-[var(--accent-dim)] rounded-full transition-all hover:bg-[var(--accent)]/15 cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M12 3L14.5 8.5L20 9.27L16 13.14L16.94 18.63L12 16L7.06 18.63L8 13.14L4 9.27L9.5 8.5L12 3Z" />
            </svg>
            <span>Pregunta con IA</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-[5px] p-2 cursor-pointer"
            aria-label="Menú"
          >
            <span className={`block w-5 h-[1.5px] bg-white transition-all ${mobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all ${mobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#141414] border-t border-[var(--border)] px-[var(--pad-page)] py-4 max-h-[calc(100vh-56px)] overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2.5 text-[14px] rounded-lg no-underline transition-colors ${
                isActive(item.href)
                  ? 'text-white bg-white/[0.08]'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider px-3 pt-4 pb-2">Temas</div>
          {topics.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-[14px] rounded-lg no-underline transition-colors ${
                isActive(topic.href)
                  ? 'text-white bg-white/[0.08]'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <span>{topic.emoji}</span>
              <span>{topic.label}</span>
            </Link>
          ))}

          <Link
            href="/fuentes"
            className={`flex items-center gap-3 px-3 py-2.5 text-[14px] rounded-lg no-underline transition-colors ${
              isActive('/fuentes')
                ? 'text-white bg-white/[0.08]'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            <span>📋</span>
            <span>Fuentes</span>
          </Link>

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => { openChat(); setMobileOpen(false); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-[13px] font-medium text-[var(--accent)] bg-[var(--accent-dim)] rounded-full transition-all hover:bg-[var(--accent)]/15 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M12 3L14.5 8.5L20 9.27L16 13.14L16.94 18.63L12 16L7.06 18.63L8 13.14L4 9.27L9.5 8.5L12 3Z" />
              </svg>
              <span>Pregunta con IA</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
