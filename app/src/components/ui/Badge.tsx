interface BadgeProps {
  label: string;
  color?: string;
}

export default function Badge({ label, color }: BadgeProps) {
  return (
    <span
      className="inline-block px-2 py-[2px] text-[11px] font-medium rounded-md"
      style={{
        background: color ? `${color}20` : 'var(--accent-dim)',
        color: color || 'var(--accent)',
      }}
    >
      {label}
    </span>
  );
}
