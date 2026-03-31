# México en Datos — Brand & Design System

## Identity

**Name**: México en Datos
**Tagline**: Estadísticas públicas de México, accesibles para todos
**Tone**: Authoritative but approachable. Data-first, not decoration-first. Let the numbers breathe.

---

## Color Palette

### Core Colors

| Token | Hex | RGB (0–255) | CSS Variable | Use |
|---|---|---|---|---|
| Black | `#000000` | 0, 0, 0 | `--bg` | Page background |
| Surface | `#141414` | 20, 20, 20 | `--surface` | Cards, chart containers, tooltip bg |
| Surface Hover | `#1a1a1a` | 26, 26, 26 | `--surface-hover` | Card hover state |
| Accent (Amber) | `#FF9F43` | 255, 159, 67 | `--accent` | Primary accent — active buttons, sparklines, primary chart series, highlights |
| Accent Glow | `rgba(255,159,67,0.35)` | — | `--accent-glow` | Glow effects, focus rings |
| Accent Dim | `rgba(255,159,67,0.12)` | — | `--accent-dim` | Subtle accent backgrounds |

### Semantic Colors

| Token | Hex | CSS Variable | Use |
|---|---|---|---|
| Positive | `#22C55E` | `--positive` | Good trends (unemployment down, coverage up) |
| Negative | `#EF4444` | `--negative` | Bad trends, alerts, warning indicators |

### Text Colors

| Token | Value | CSS Variable | Use |
|---|---|---|---|
| Primary | `rgba(255,255,255,0.95)` | `--text-primary` | Headlines, big numbers, emphasis |
| Secondary | `rgba(255,255,255,0.72)` | `--text-secondary` | Body text, descriptions |
| Muted | `rgba(255,255,255,0.48)` | `--text-muted` | Labels, captions, axis labels, inactive tabs |

### Borders

| Token | Value | CSS Variable | Use |
|---|---|---|---|
| Border | `rgba(255,255,255,0.08)` | `--border` | Card borders, dividers, inactive button borders |
| Border Hover | `rgba(255,255,255,0.12)` | — | Card hover borders |

### Chart Series Palette

When displaying multiple series on one chart, use these colors in order:

| Order | Name | Hex | Use |
|---|---|---|---|
| 1 | Accent | `#FF9F43` | Primary series (always use first) |
| 2 | Red | `#EF4444` | Second series / negative connotation |
| 3 | Lavender | `#A592D5` | Third series / neutral |
| 4 | Teal | `#2DD4BF` | Fourth series |
| 5 | Blue | `#60A5FA` | Fifth series |
| 6 | Pink | `#F472B6` | Sixth series |

For categorical data (e.g., states, sectors) with many categories, use the accent color at varying opacities: 100%, 70%, 50%, 35%, 20%.

### Green-Red Gradient (Continuous)

For heatmaps and treemaps where values range from low to high:

```javascript
// Interpolate from green → yellow → red
// With contrast boost (power 0.55)
function greenRedCSS(t, alpha = 1) {
  t = Math.pow(Math.max(0, Math.min(1, t)), 0.55);
  const r = Math.round(t < 0.5 ? 34 + t * 2 * 221 : 255);
  const g = Math.round(t < 0.5 ? 197 : 197 - (t - 0.5) * 2 * 153);
  const b = Math.round(t < 0.5 ? 94 - t * 2 * 94 : 44);
  return `rgba(${r},${g},${b},${alpha})`;
}
```

### Choropleth Map Colors

For geographic data (state/municipality maps), use a single-hue sequential scale:

- **Low → High**: `#1a1a2e` → `#FF9F43` (dark navy to accent amber)
- **Diverging** (e.g., above/below average): `#22C55E` → `#141414` → `#EF4444`

---

## Typography

### Font

**Primary**: Inter (Google Fonts)
**Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
**Weights loaded**: 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Type Scale

| Element | Size | Weight | Letter-spacing | Line-height | Color |
|---|---|---|---|---|---|
| Page title (h1) | 56px / 36px mobile | 700 | -0.04em | 1.1 | `#fff` |
| Section title (h2) | 24px | 700 | -0.03em | 1.2 | `#fff` |
| Chart title | 16px | 600 | -0.02em | 1.3 | `#fff` |
| Body / subtitle | 15px / 14px mobile | 400 | normal | 1.65 | `--text-secondary` |
| Stat big number | 32px / 24px mobile | 700 | -0.03em | 1 | `--text-primary` |
| Card headline number | 28px / 22px mobile | 700 | -0.03em | 1 | `--text-primary` |
| Button / tab label | 13px (nav), 12px (chart), 11px (small) | 500 (inactive), 600 (active) | normal | 1 | varies |
| Stat label (uppercase) | 11px | 600 | 0.08em | 1 | `--text-muted` |
| Axis label | 11px | 400 | normal | 1 | `rgba(255,255,255,0.3)` |
| Caption / source text | 13px | 400 | normal | 1.6 | `--text-muted` |
| Methodology callout | 13px / 12px mobile | 400 | normal | 1.6 | `--text-muted` |

### Text Rules

- Headlines use tight negative letter-spacing (`-0.03em` to `-0.04em`) for a modern feel
- Body text uses default letter-spacing for readability
- Uppercase is reserved for stat labels and small UI elements — never for titles or body text
- `text-wrap: pretty` on paragraph text to avoid orphans
- Always use `tabular-nums` (`font-variant-numeric: tabular-nums`) on data values so columns align

---

## Layout

### Container

```css
max-width: 1400px;
width: 100%;
margin: 0 auto;
```

### Horizontal Padding

- Desktop: `28px`
- Mobile (<600px): `16px`

### Spacing Scale

| Token | Value | Use |
|---|---|---|
| `xs` | 4px | Tight gaps (within a stat block) |
| `sm` | 8px | Small gaps, inline spacing |
| `md` | 12px | Grid gaps, card padding inner |
| `lg` | 16px–20px | Section internal padding |
| `xl` | 28px–32px | Section margins, hero padding |
| `2xl` | 40px–48px | Between major sections |

### Breakpoints

| Name | Width | Changes |
|---|---|---|
| Mobile | `<600px` | Single/double column, reduced type, reduced padding |

We use a single breakpoint. The layout is fluid between 600px and 1400px via `auto-fill` grids.

---

## Components

### Card

The basic surface container for any content block.

```css
.card {
  background: var(--surface);       /* #141414 */
  border: 1px solid var(--border);  /* rgba(255,255,255,0.08) */
  border-radius: 10px;
  padding: 16px 18px;
  transition: all 0.15s;
}
.card:hover {
  background: var(--surface-hover);
  border-color: rgba(255,255,255,0.12);
}
```

- Use `border-radius: 12px` for larger containers (chart sections)
- Use `border-radius: 10px` for standard cards
- Use `border-radius: 6px` for buttons and small elements
- Use `border-radius: 5px` for small chart-control buttons

### Button / Tab

```css
/* Inactive */
padding: 8px 18px;          /* nav tab */
padding: 6px 14px;          /* standard */
padding: 5px 12px;          /* chart control (small) */
font-size: 13px / 12px / 11px;
font-weight: 500;
border: 1px solid var(--border);
border-radius: 6px;
background: transparent;
color: var(--text-muted);
cursor: pointer;
transition: all 0.15s;

/* Active */
background: var(--accent);
color: #000;
border-color: var(--accent);
font-weight: 600;

/* Hover (inactive) */
background: rgba(255,255,255,0.04);
color: var(--text-secondary);
```

Buttons are always grouped in a flex row with `gap: 3px`.

### Headline Indicator Card

Shows a single KPI with sparkline. Used on the landing page and section dashboards.

Structure:
```
┌────────────────────┐
│ LABEL (11px upper) │
│ 4.02%  (28px bold) │
│ ↓ 0.19 pp vs mes   │
│ INPC · Mar 2026    │
│ ▁▂▃▅▆▇█▇▆▅▄▃▂     │ ← sparkline
└────────────────────┘
```

- Card label: 11px, 600, uppercase, 0.08em spacing, `--text-muted`
- Value: 28px, 700, `-0.03em` spacing
- Change indicator: 12px, 600, colored positive/negative
- Sub-label: 11px, `--text-muted`
- Sparkline: 160×32px canvas, accent color line + fill

### Stat Block

For inline stats in dashboards (not in cards):

```
LABEL (11px uppercase muted)
32px big number
11px sub-label
```

### Sparkline

Mini trend line rendered to a `<canvas>` element.

```
Width: 160px (or card width)
Height: 32px
Line: 1.5px, rgba(255,159,67,0.6)
Fill: rgba(255,159,67,0.08) under the line
End dot: 2.5px radius, solid accent
Padding: 2px vertical
```

### Tooltip

Follows the cursor on chart hover.

```css
position: fixed;
pointer-events: none;
background: var(--surface);
border: 1px solid var(--border);
border-radius: 10px;
padding: 12px 16px;
max-width: 300px;
box-shadow: 0 8px 32px rgba(0,0,0,0.8);
opacity: 0;
transition: opacity 0.12s;
z-index: 20;
```

Content structure:
- Title: 14px, 700, `#fff`
- Value: 20px, 700, `--accent`
- Detail: 12px, `--text-muted`

For rich tooltips (treemap-style), add:
- Highlight pill: `background: var(--accent); color: #000; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600`
- Stats grid: `grid-template-columns: auto auto; gap: 6px 16px`
- Rationale section: separated by `border-top: 1px solid var(--border)`

### Horizontal Bar Chart

For ranked data (causes of death, state comparisons, etc.):

```
Label (right-aligned)  [████████████████░░░░░░]  Value
140px label             flex-1 track              60px value
```

```css
Track: height 20px, border-radius 10px, bg rgba(255,255,255,0.04)
Fill: border-radius 10px, accent color (or series color)
Label: 12px, --text-secondary, right-aligned
Value: 12px, 600, --text-primary, right-aligned
Row gap: 6px
```

### Section Header

```
Section Title              Explorar indicador →
h2 (24px bold)            link (13px muted, underline)
```

Flex row, `align-items: baseline`, `gap: 12px`. Link underline: `text-decoration-color: rgba(255,255,255,0.15)`, hover: accent.

### Methodology Callout

```css
border-left: 2px solid var(--accent);
padding-left: 16px;
font-size: 13px;
line-height: 1.6;
color: var(--text-muted);
max-width: 700px;
```

### Topic / Navigation Card

For the "Explore by topic" grid:

```
┌──────────────────────────────┐
│ 📈 (icon, 20px)             │
│ Economía (15px, 600, white) │
│ Description (13px secondary) │
│                              │
│ 300+        Quincenal        │
│ SERIES      ACTUALIZACIÓN    │
└──────────────────────────────┘
```

Stat values in accent color (16px, 700). Stat labels in muted (10px, uppercase).

---

## Charts

### General Rules

1. **Canvas rendering** — Use HTML5 Canvas 2D for all charts. No SVG, no charting libraries. This keeps the site fast and dependency-free.
2. **DPR-aware** — Always scale canvas by `window.devicePixelRatio` for crisp rendering on retina displays.
3. **Responsive** — Charts resize on `window.resize`. Width fills container, height is proportional (typically 0.4–0.5 × width, max ~340px).
4. **Interactive** — All charts support mouse hover with tooltip. Touch on mobile.
5. **Animated transitions** — Keep minimal. CSS transitions on bar fills (0.6s ease). No chart entrance animations — data should appear instantly.

### Chart Container

Every chart lives inside a `.chart-container`:

```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 12px;
padding: 24px;  /* 16px mobile */
```

With a header:
- Chart title: 16px, 600, white
- Chart subtitle: 13px, muted (source attribution goes here)
- Controls: right-aligned button group

### Time Series (Line / Area)

The primary chart type for indicators.

**Grid**:
- Y-axis labels: 11px, `rgba(255,255,255,0.3)`, right-aligned, left of chart area
- Grid lines: `rgba(255,255,255,0.05)`, 1px
- X-axis labels: 11px, `rgba(255,255,255,0.3)`, centered below, show years only (not every month)
- Padding: left 48px (for y-labels), right 16px, top 16px, bottom 32px

**Line**:
- Stroke: 2px, series color, `lineJoin: 'round'`
- Area fill: vertical gradient from `color + '25'` (top) to `color + '02'` (bottom)

**Reference bands** (e.g., Banxico target):
- Fill: `rgba(34,197,94,0.06)`
- Dashed center line: `[4,4]`, `rgba(34,197,94,0.3)`
- Label: 10px, `rgba(34,197,94,0.5)`

**End marker**:
- Solid circle: 4px radius, series color
- Value label: 12px, 600, series color, positioned above-left of dot

### Treemap

Used for hierarchical data (occupations, sectors, geographic breakdowns).

- Squarified layout algorithm (greedy row-based, optimize aspect ratio)
- Two-level hierarchy: category → items
- Rect rendering: filled with metric-based color, 1px gap between rects
- Hover: 2px accent stroke
- Text: clipped to rect, scales with rect size (9–13px)
- Interactive tooltip on hover

### Choropleth Map

For state/municipality geographic data. (To be implemented in Scope 5+)

- Use MapLibre GL JS or pre-rendered SVG paths from Marco Geoestadístico
- Sequential color scale: dark → accent
- Hover: accent stroke + tooltip
- Legend: gradient bar with min/max labels

### Bar Chart (Vertical)

For categorical comparisons with few categories.

- Bars: accent color, `border-radius: 2px 2px 0 0`
- Gap: 2px between bars
- Labels below: 10px, muted
- Values above bars or in tooltip

---

## Interactions

### Transitions

| Element | Property | Duration | Easing |
|---|---|---|---|
| Button background/color | all | 0.15s | ease (default) |
| Card background/border | all | 0.15s | ease |
| Tooltip opacity | opacity | 0.12s | ease |
| Bar chart fill width | width | 0.6s | ease |
| Link color | color | 0.15s | ease |

### Hover States

- **Cards**: background lightens to `--surface-hover`, border brightens
- **Buttons**: background gets subtle white overlay `rgba(255,255,255,0.04)`
- **Links**: color shifts to accent, underline color shifts to accent
- **Chart elements**: accent-colored stroke/highlight + tooltip appears

### Cursor

- Cards and buttons: `cursor: pointer`
- Chart canvas: `cursor: default` (tooltip follows mouse)
- Everything else: default

---

## Attribution & Sources

Every page and chart must include data source attribution.

**Format**: `Fuente: [Source], [Product Name]` — 13px, muted, below chart or in footer.

**Multi-source pages**: List all contributing sources, separated by ` | ` or on separate lines.

**Example**:
```
Fuente: INEGI, Estadísticas de Mortalidad | CONAPO, Proyecciones de Población
Última actualización: enero 2026
```

---

## Social Sharing

Every chart/page should generate an Open Graph preview image.

**OG Image spec**:
- Size: 1200×630px
- Background: `#000000`
- Title: 32px, 700, white, top-left with 48px padding
- Chart: rendered at center
- Logo/brand: "México en Datos" at bottom, 14px, muted
- Border: 1px accent line at top

---

## Accessibility

- All chart data must be available as an HTML `<table>` (visually hidden, screen-reader accessible)
- Color is never the only differentiator — use pattern/shape/label as secondary encoding
- Minimum contrast: text on dark backgrounds meets WCAG AA (all our text colors do)
- All interactive elements keyboard-navigable
- Canvas charts: provide `aria-label` with summary of what the chart shows
- Prefer `prefers-reduced-motion` media query: skip sparkline animations if set

---

## File Organization

When we move to the component-based architecture (Next.js), the design system lives in:

```
app/src/
  styles/
    tokens.css          -- CSS custom properties (this palette)
    reset.css           -- Box-sizing, margin reset, font smoothing
    typography.css      -- Type scale classes
    components.css      -- Card, button, stat, bar styles
  components/
    ui/
      Card.tsx          -- Surface container
      Button.tsx        -- Tab/toggle button
      StatCard.tsx      -- Headline indicator with sparkline
      StatBlock.tsx     -- Inline stat (label + big number)
      Tooltip.tsx       -- Chart hover tooltip
      SectionHeader.tsx -- h2 + link
    charts/
      Sparkline.tsx     -- Mini trend canvas
      TimeSeries.tsx    -- Line/area chart canvas
      HBar.tsx          -- Horizontal bar chart
      Treemap.tsx       -- Squarified treemap canvas
      Choropleth.tsx    -- Geographic map
    layout/
      PageWrapper.tsx   -- Max-width container
      NavTabs.tsx       -- Section navigation
      Footer.tsx        -- Attribution + links
  lib/
    colors.ts           -- Color functions (greenRedCSS, series palette, etc.)
    format.ts           -- Number formatting (thousands, percentages, currency)
    canvas.ts           -- DPR helpers, common canvas utilities
```
