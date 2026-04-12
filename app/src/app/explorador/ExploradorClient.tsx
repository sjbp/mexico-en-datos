'use client';

import { useState, useMemo } from 'react';
import SearchInput from '@/components/ui/SearchInput';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { Indicator } from '@/lib/types';
import { getIndicatorDescription } from '@/lib/indicatorDescriptions';
import { fmtTopic } from '@/lib/format';

interface ExploradorClientProps {
  indicators: Indicator[];
  topics: { topic: string; count: number }[];
  initialTopic?: string;
}

export default function ExploradorClient({ indicators, topics, initialTopic }: ExploradorClientProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(initialTopic || 'todos');

  const tabs = useMemo(() => {
    const totalCount = topics.reduce((sum, t) => sum + t.count, 0);
    return [
      { id: 'todos', label: 'Todos', count: totalCount },
      ...topics.map((t) => ({ id: t.topic, label: fmtTopic(t.topic), count: t.count })),
    ];
  }, [topics]);

  const filtered = useMemo(() => {
    return indicators.filter((ind) => {
      const matchesTopic = activeTab === 'todos' || ind.topic === activeTab;
      const matchesSearch =
        !search || ind.name_es.toLowerCase().includes(search.toLowerCase());
      return matchesTopic && matchesSearch;
    });
  }, [indicators, search, activeTab]);

  // Group by topic for the "Todos" view
  const grouped = useMemo(() => {
    if (activeTab !== 'todos' || search) return null;
    const groups: { topic: string; label: string; items: Indicator[] }[] = [];
    const seen = new Set<string>();
    for (const ind of filtered) {
      if (!seen.has(ind.topic)) {
        seen.add(ind.topic);
        groups.push({ topic: ind.topic, label: fmtTopic(ind.topic), items: [] });
      }
      groups.find((g) => g.topic === ind.topic)!.items.push(ind);
    }
    return groups;
  }, [filtered, activeTab, search]);

  return (
    <>
      <div className="px-[var(--pad-page)] mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar indicador..."
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 px-[var(--pad-page)] mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}{' '}
            <span className={activeTab === tab.id ? 'opacity-60' : 'opacity-40'}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Grouped view (when showing all, no search) */}
      {grouped ? (
        <div className="px-[var(--pad-page)]">
          {grouped.map((group) => (
            <div key={group.topic} className="mb-8">
              <h3 className="text-[15px] font-semibold text-white mb-3">{group.label}</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 max-sm:grid-cols-1">
                {group.items.map((ind) => (
                  <IndicatorCard key={ind.id} ind={ind} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 px-[var(--pad-page)] max-sm:grid-cols-1">
          {filtered.map((ind) => (
            <IndicatorCard key={ind.id} ind={ind} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center text-[var(--text-muted)] py-12 px-[var(--pad-page)]">
          No se encontraron indicadores.
        </div>
      )}
    </>
  );
}

function IndicatorCard({ ind }: { ind: Indicator }) {
  const desc = getIndicatorDescription(ind.id);
  const truncatedSummary = desc
    ? desc.summary.length > 100
      ? desc.summary.slice(0, 97) + '...'
      : desc.summary
    : null;

  return (
    <a href={`/indicador/${ind.id}`} className="block no-underline text-inherit">
      <Card interactive>
        <div className="text-[14px] font-semibold text-white leading-tight mb-1">
          {ind.name_es.replace(/\s*\(.*\)$/, '')}
        </div>
        {truncatedSummary && (
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
            {truncatedSummary}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Badge label={fmtTopic(ind.topic)} />
          <span>{ind.frequency ?? '\u2014'} &middot; {ind.source ?? 'INEGI'}</span>
        </div>
        {desc?.staleWarning && (
          <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 mt-2">
            Serie historica &middot; Congelado Jul 2024
          </div>
        )}
      </Card>
    </a>
  );
}
