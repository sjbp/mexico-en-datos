/** Build an SVG path string for a sparkline. Returns stroke + fill paths. */

export function sparklinePath(
  values: number[],
  width: number,
  height: number,
): { line: string; fill: string } {
  if (values.length < 2) return { line: '', fill: '' };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const pts = values.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / span) * height,
  }));

  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const last = pts[pts.length - 1];
  const fill = `${line} L ${last.x.toFixed(1)} ${height} L 0 ${height} Z`;

  return { line, fill };
}
