export function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '\u2014';
  return n.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '\u2014';
  return n.toFixed(decimals) + '%';
}

export function fmtCurrency(n: number | null | undefined, currency = 'MXN'): string {
  void currency;
  if (n == null || isNaN(n)) return '\u2014';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + fmtNum(n);
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '\u2014';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return fmtNum(n);
}
