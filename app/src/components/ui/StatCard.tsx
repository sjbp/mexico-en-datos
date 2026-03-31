'use client';

import Card from './Card';
import Sparkline from '../charts/Sparkline';

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  changePeriod?: string;
  sub?: string;
  sparkValues?: number[];
  isGoodDown?: boolean;
}

export default function StatCard({
  label,
  value,
  change,
  changePeriod,
  sub,
  sparkValues,
  isGoodDown = true,
}: StatCardProps) {
  const dir = change < 0 ? 'down' : change > 0 ? 'up' : 'flat';
  const colorClass =
    dir === 'flat'
      ? ''
      : dir === 'down'
        ? isGoodDown ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
        : isGoodDown ? 'text-[var(--negative)]' : 'text-[var(--positive)]';
  const arrow = dir === 'down' ? '\u2193' : dir === 'up' ? '\u2191' : '';

  return (
    <Card interactive>
      <div className="flex flex-col">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
          {label}
        </div>
        <div className="text-[28px] font-bold tracking-tight leading-none mb-[6px] tabular-nums">
          {value}
        </div>
        <div className={`text-xs font-semibold flex items-center gap-1 ${colorClass}`}>
          {arrow} {Math.abs(change).toFixed(1)} pp {changePeriod || ''}
        </div>
        {sub && (
          <div className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</div>
        )}
        {sparkValues && sparkValues.length > 1 && (
          <div className="mt-3">
            <Sparkline values={sparkValues} width={160} height={32} />
          </div>
        )}
      </div>
    </Card>
  );
}
