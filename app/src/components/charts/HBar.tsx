interface HBarDatum {
  label: string;
  value: number;
  color?: string;
}

interface HBarProps {
  data: HBarDatum[];
  maxVal?: number;
  valueFmt?: (v: number) => string;
}

export default function HBar({ data, maxVal, valueFmt }: HBarProps) {
  const max = maxVal || Math.max(...data.map((d) => d.value));
  const fmt = valueFmt || ((v: number) => v.toFixed(1));

  return (
    <div className="flex flex-col gap-[6px]">
      {data.map((d, i) => {
        const pct = ((d.value / max) * 100).toFixed(1);
        const barColor = d.color || 'var(--accent)';
        return (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            <div className="w-[140px] shrink-0 text-[var(--text-secondary)] text-xs text-right">
              {d.label}
            </div>
            <div className="flex-1 h-5 bg-white/[0.04] rounded-[10px] overflow-hidden">
              <div
                className="h-full rounded-[10px] transition-[width] duration-600"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            <div className="w-[60px] shrink-0 text-xs text-[var(--text-primary)] text-right font-semibold tabular-nums">
              {fmt(d.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
