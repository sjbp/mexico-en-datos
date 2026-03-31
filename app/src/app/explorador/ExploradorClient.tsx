'use client';

import { useState, useMemo } from 'react';
import NavTabs from '@/components/ui/NavTabs';
import SearchInput from '@/components/ui/SearchInput';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { Indicator } from '@/lib/types';
import { getIndicatorDescription } from '@/lib/indicatorDescriptions';

interface ExploradorClientProps {
  indicators: Indicator[];
  topics: { topic: string; count: number }[];
  initialTopic?: string;
}

export default function ExploradorClient({ indicators, topics, initialTopic }: ExploradorClientProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(initialTopic || 'todos');

  const tabs = useMemo(() => {
    const allTabs = [{ id: 'todos', label: 'Todos' }];
    for (const t of topics) {
      const displayName = t.topic
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      allTabs.push({ id: t.topic, label: displayName });
    }
    return allTabs;
  }, [topics]);

  const filtered = useMemo(() => {
    return indicators.filter((ind) => {
      const matchesTopic = activeTab === 'todos' || ind.topic === activeTab;
      const matchesSearch =
        !search || ind.name_es.toLowerCase().includes(search.toLowerCase());
      return matchesTopic && matchesSearch;
    });
  }, [indicators, search, activeTab]);

  return (
    <>
      <div className="px-[var(--pad-page)] mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar indicador..."
        />
      </div>

      <NavTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 px-[var(--pad-page)] max-sm:grid-cols-1">
        {filtered.map((ind) => {
          const topicDisplay = ind.topic
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          const desc = getIndicatorDescription(ind.id);
          const truncatedSummary = desc
            ? desc.summary.length > 100
              ? desc.summary.slice(0, 97) + '...'
              : desc.summary
            : null;

          return (
            <a
              key={ind.id}
              href={`/indicador/${ind.id}`}
              className="block no-underline text-inherit"
            >
              <Card interactive>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-[15px] font-semibold text-white leading-tight">
                    {ind.name_es}
                  </div>
                  <Badge label={topicDisplay} />
                </div>
                {truncatedSummary && (
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                    {truncatedSummary}
                  </div>
                )}
                <div className="text-xs text-[var(--text-muted)] mb-3">
                  {ind.frequency ?? '—'} &middot; {ind.unit ?? '—'}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {ind.source ?? 'INEGI'}
                </div>
              </Card>
            </a>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-[var(--text-muted)] py-12 px-[var(--pad-page)]">
          No se encontraron indicadores.
        </div>
      )}
    </>
  );
}
