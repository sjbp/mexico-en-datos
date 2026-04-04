import Link from 'next/link';

interface StaleWarningBannerProps {
  warning: string;
}

/**
 * Renders an amber/yellow warning banner for stale or frozen indicators.
 * Supports markdown-style links: [text](href)
 */
export default function StaleWarningBanner({ warning }: StaleWarningBannerProps) {
  // Parse markdown links [text](href) into JSX
  const parts = warning.split(/(\[[^\]]+\]\([^)]+\))/g);
  const rendered = parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <Link
          key={i}
          href={match[2]}
          className="underline font-semibold hover:text-amber-100 transition-colors"
        >
          {match[1]}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
      <span className="text-amber-400 text-lg leading-none mt-0.5">&#9888;</span>
      <p className="text-sm text-amber-200 leading-relaxed">
        {rendered}
      </p>
    </div>
  );
}
