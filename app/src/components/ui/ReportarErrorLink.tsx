'use client';

import { useEffect, useState } from 'react';

const BASE_ISSUE_URL =
  'https://github.com/sjbp/mexico-en-datos/issues/new?labels=bug&template=bug_report.md&title=%5BBug%5D+';

export default function ReportarErrorLink({ className }: { className: string }) {
  const [href, setHref] = useState(BASE_ISSUE_URL + '&body=Describe%20el%20error%3A%0A%0A');

  useEffect(() => {
    const body = `Describe el error:\n\nURL: ${window.location.href}\n\n`;
    setHref(BASE_ISSUE_URL + '&body=' + encodeURIComponent(body));
  }, []);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Reportar error
    </a>
  );
}
