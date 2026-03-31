interface CardProps {
  children: React.ReactNode;
  interactive?: boolean;
  large?: boolean;
  className?: string;
}

export default function Card({ children, interactive, large, className = '' }: CardProps) {
  const base = 'bg-[var(--surface)] border border-[var(--border)]';
  const radius = large ? 'rounded-xl' : 'rounded-lg';
  const padding = large ? 'p-6' : 'px-[18px] py-4';
  const hover = interactive
    ? 'transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] cursor-pointer'
    : 'transition-all duration-150';

  return (
    <div className={`${base} ${radius} ${padding} ${hover} ${className}`}>
      {children}
    </div>
  );
}
