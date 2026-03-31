/** Initialize a canvas for DPR-aware drawing. Returns the 2D context. */
export function initCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

/** Compute responsive canvas size from a container element. */
export function canvasSize(
  container: HTMLElement,
  aspectRatio = 0.45,
  maxHeight = 340,
): { w: number; h: number } | null {
  const w = container.clientWidth;
  if (w === 0) return null;
  const h = Math.min(maxHeight, w * aspectRatio);
  return { w, h };
}
