'use client';

import { usePathname } from 'next/navigation';

const BASE_URL = 'https://datamx.sebastian.mx';
const GITHUB_BASE = 'https://github.com/sjbp/mexico-en-datos/issues/new?labels=bug&template=bug_report.md&title=%5BBug%5D+';

interface BugReportLinkProps {
  className?: string;
}

export default function BugReportLink({ className }: BugReportLinkProps) {
  const pathname = usePathname();
  const pageUrl = `${BASE_URL}${pathname}`;
  const body = `Describe el error:\n\nPágina: ${pageUrl}\n\n`;
  const href = `${GITHUB_BASE}&body=${encodeURIComponent(body)}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Reportar error
    </a>
  );
}
