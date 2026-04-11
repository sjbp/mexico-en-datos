import {
  streamText,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  stepCountIs,
  UIMessage,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  getIndicators as _getIndicators,
  getIndicator as _getIndicator,
  getIndicatorValues as _getIndicatorValues,
  getLatestValue as _getLatestValue,
  getIndicatorValuesByState as _getIndicatorValuesByState,
  getTopicsWithCounts as _getTopicsWithCounts,
  getEmploymentByDimension as _getEmploymentByDimension,
  getEmploymentTrends as _getEmploymentTrends,
  getCifraNegra as _getCifraNegra,
  getEnvipeStats as _getEnvipeStats,
  getLeadingCausesOfDeath as _getLeadingCausesOfDeath,
} from '@/lib/data';
import { cached } from '@/lib/cache';

export const maxDuration = 60;

// ── Cached data layer (30-min TTL, deduped) ─────────────────────────────
// AI SDK already executes multiple tool calls per step in parallel (Promise.all).
// The cache eliminates redundant DB hits across turns and conversations.

const getIndicators = cached(_getIndicators);
const getIndicator = cached(_getIndicator);
const getIndicatorValues = cached(_getIndicatorValues);
const getLatestValue = cached(_getLatestValue);
const getIndicatorValuesByState = cached(_getIndicatorValuesByState);
const getTopicsWithCounts = cached(_getTopicsWithCounts);
const getEmploymentByDimension = cached(_getEmploymentByDimension);
const getEmploymentTrends = cached(_getEmploymentTrends);
const getCifraNegra = cached(_getCifraNegra);
const getEnvipeStats = cached(_getEnvipeStats);
const getLeadingCausesOfDeath = cached(_getLeadingCausesOfDeath);

// ── Pre-warm cache with queries expected from homepage suggestions ───────
let _warmed = false;
function ensureWarmed() {
  if (_warmed) return;
  _warmed = true;
  Promise.all([
    // "¿Cuál es la inflación actual?" / "¿Cómo ha evolucionado la inflación?"
    getLatestValue('inflacion_general', '00'),
    getIndicator('inflacion_general'),
    getIndicatorValues('inflacion_general', '00', 24),
    // "Estado más violento" / "¿Cuál es el estado más violento?"
    getIndicatorValuesByState('homicidios_dolosos', { latest: true }),
    // "Causas de muerte" / "Principales causas de muerte"
    getLeadingCausesOfDeath(2023, '00'),
    // "Informalidad por sector"
    getEmploymentByDimension('sector', '00'),
    // "¿Qué delitos tienen mayor cifra negra?"
    getCifraNegra(),
    // "¿Cuál es el tipo de cambio hoy?"
    getLatestValue('tipo_cambio', '00'),
    getIndicator('tipo_cambio'),
    // Common helper queries (search, topics)
    getIndicators(),
    getTopicsWithCounts(),
  ]).catch(console.error);
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Safely coerce a DB value (possibly string) to number */
function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Format a period string like "2024/03" into a readable x-axis label. */
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
let _prevYear = '';
function formatPeriodLabel(period: string, index: number): string {
  if (index === 0) _prevYear = '';
  if (!period) return '';
  if (period.includes('Q')) return period.replace('/', ' ');

  let year: string;
  let month: number;

  if (period.includes('/')) {
    const parts = period.split('/');
    year = parts[0];
    month = parseInt(parts[1], 10);
  } else if (period.includes('-')) {
    const parts = period.split('-');
    year = parts[0];
    month = parseInt(parts[1], 10);
  } else {
    return period;
  }

  if (isNaN(month)) return period;
  const monthName = MONTH_NAMES[month - 1] || '';
  const showYear = year !== _prevYear;
  _prevYear = year;
  if (showYear) return `${monthName} ${year.slice(-2)}`;
  return monthName;
}

// ── State code → name lookup (INEGI codes, stable) ──────────────────────
const STATE_NAMES: Record<string, string> = {
  '01': 'Aguascalientes', '02': 'Baja California', '03': 'Baja California Sur',
  '04': 'Campeche', '05': 'Coahuila', '06': 'Colima', '07': 'Chiapas',
  '08': 'Chihuahua', '09': 'CDMX', '10': 'Durango', '11': 'Guanajuato',
  '12': 'Guerrero', '13': 'Hidalgo', '14': 'Jalisco', '15': 'Edo. Méx.',
  '16': 'Michoacán', '17': 'Morelos', '18': 'Nayarit', '19': 'Nuevo León',
  '20': 'Oaxaca', '21': 'Puebla', '22': 'Querétaro', '23': 'Quintana Roo',
  '24': 'San Luis Potosí', '25': 'Sinaloa', '26': 'Sonora', '27': 'Tabasco',
  '28': 'Tamaulipas', '29': 'Tlaxcala', '30': 'Veracruz', '31': 'Yucatán',
  '32': 'Zacatecas', '00': 'Nacional',
};
function stateName(code: string): string {
  return STATE_NAMES[code] ?? code;
}

// ── System prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el asistente de datos de M\u00e9xico en Datos.

Respondes preguntas sobre M\u00e9xico usando datos oficiales de INEGI, Banxico, SESNSP y CONEVAL.

Estilo de respuesta:
- SIEMPRE genera una gr\u00e1fica cuando respondas con datos num\u00e9ricos. La gr\u00e1fica es lo principal, el texto la interpreta brevemente.
- CORTO y directo. 2-3 oraciones m\u00e1ximo interpretando la gr\u00e1fica.
- NUNCA uses tablas. Las gr\u00e1ficas las reemplazan.
- NUNCA listes m\u00e1s de 3-4 datos en texto. Menciona los extremos y deja que la gr\u00e1fica muestre el resto.
- NUNCA uses headers markdown (###, ##, #). Escribe texto plano, p\u00e1rrafos cortos.
- Formato permitido: **negritas** para datos clave, [links](/indicador/ID), listas cortas con "-". Nada m\u00e1s.
- Cita la fuente al final: "Fuente: INEGI, feb 2026"
- Si no tienes datos, dilo brevemente y sugiere qu\u00e9 s\u00ed hay.
- No inventes datos.

Visualizaciones:
REGLA: Siempre produce una gr\u00e1fica. Si la pregunta involucra datos, usa una herramienta que genere visualizaci\u00f3n.

Gr\u00e1ficas autom\u00e1ticas (se generan al usar estas herramientas):
- get_indicator_timeseries \u2192 l\u00ednea temporal
- get_indicator_by_state \u2192 barras top 10 + distribuci\u00f3n de 32 estados
- get_employment_by_dimension \u2192 barras de informalidad
- get_crime_stats \u2192 barras de prevalencia
- get_cifra_negra \u2192 barras de cifra negra
- get_mortality_causes \u2192 barras de tasa por 100k

Gr\u00e1ficas personalizadas con create_chart:
Usa create_chart para scatter plots, distribuciones, o cuando quieras graficar campos diferentes al default. Cuando la pregunta involucre dos variables (ej: "X vs Y", "relaci\u00f3n entre X e Y"), SIEMPRE usa create_chart con scatter.

Ejemplos:
- "ingreso vs informalidad" \u2192 create_chart scatter, source employment, x=informality_rate, y=avg_monthly_income
- "distribuci\u00f3n del PIB por estado" \u2192 create_chart strip, source indicator_by_state, value=value
- "cifra negra vs confianza policial" \u2192 create_chart scatter, source cifra_negra, x=cifra_negra, y=trust_police
- "barras de ingreso por educaci\u00f3n" \u2192 create_chart bar, source employment, dimension=education, value=avg_monthly_income
- "prevalencia vs denuncia" \u2192 create_chart scatter, source crime, x=prevalence_rate, y=reported_rate
- "horas trabajadas por sector" \u2192 create_chart bar, source employment, value=avg_hours_worked

Datos disponibles:
- Macro: inflaci\u00f3n, PIB, IGAE, tipo de cambio, tasa de inter\u00e9s, confianza del consumidor
- Empleo: desocupaci\u00f3n, informalidad, subocupaci\u00f3n, PEA, desglose por sector/edad/g\u00e9nero/educaci\u00f3n
- Comercio: exportaciones e importaciones mensuales
- Seguridad: homicidios por estado, cifra negra, victimizaci\u00f3n por delito
- Salud: causas de muerte con tasas por 100k habitantes`;

// ── Chart extraction (writes data-* parts into the stream) ──────────────

type StreamWriter = {
  write: (part: { type: `data-${string}`; data: unknown }) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeChartParts(writer: StreamWriter, toolName: string, toolInput: any, toolResult: any) {
  if (!toolResult || toolResult.error) return;

  try {
    switch (toolName) {
      case 'get_indicator_timeseries': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 5) {
          const values = rows.map((r: any) => num(r.value));
          const periods = rows.map((r: any) => r.period ?? '');
          const labels = periods.map((p: string, i: number) => formatPeriodLabel(p, i));

          let chartLabel = 'Serie de tiempo';
          try {
            const indicator = await getIndicator(toolInput.indicator_id);
            if (indicator?.name_es) chartLabel = indicator.name_es;
          } catch { /* fallback */ }

          writer.write({
            type: 'data-timeseries',
            data: { values, labels, periods, label: chartLabel, color: '#FF9F43' },
          });
        }
        break;
      }

      case 'get_indicator_by_state': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 5) {
          const sorted = [...rows]
            .filter((r: any) => r.value != null)
            .sort((a: any, b: any) => num(b.value) - num(a.value));
          writer.write({
            type: 'data-hbar',
            data: {
              items: sorted.slice(0, 10).map((r: any) => ({
                label: r.state_name ?? r.geo_code,
                value: num(r.value),
              })),
            },
          });
          // Distribution strip for all states
          if (sorted.length >= 10) {
            writer.write({
              type: 'data-dotstrip',
              data: {
                points: sorted.map((r: any) => ({
                  label: r.state_name ?? stateName(r.geo_code),
                  value: num(r.value),
                })),
                title: 'Distribuci\u00f3n por estado',
              },
            });
          }
        }
        break;
      }

      case 'get_employment_by_dimension': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          const sorted = [...rows]
            .filter((r: any) => r.informality_rate != null)
            .sort((a: any, b: any) => num(b.informality_rate) - num(a.informality_rate));
          writer.write({
            type: 'data-hbar',
            data: {
              items: sorted.map((r: any) => ({
                label: r.dimension_value,
                value: num(r.informality_rate),
              })),
              valueFmt: '%',
            },
          });
          // Auto-scatter: informality vs income (safety net)
          const withBoth = rows.filter(
            (r: any) => r.informality_rate != null && r.avg_monthly_income != null,
          );
          if (withBoth.length >= 2) {
            writer.write({
              type: 'data-scatter',
              data: {
                points: withBoth.map((r: any) => ({
                  label: r.dimension_value,
                  x: num(r.informality_rate),
                  y: num(r.avg_monthly_income),
                })),
                xLabel: 'Informalidad (%)',
                yLabel: 'Ingreso mensual ($)',
                xUnit: '%', yUnit: '$', xDecimals: 1, yDecimals: 0,
                title: 'Informalidad vs Ingreso',
              },
            });
          }
        }
        break;
      }

      case 'get_crime_stats': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          const sorted = [...rows]
            .filter((r: any) => r.prevalence_rate != null)
            .sort((a: any, b: any) => num(b.prevalence_rate) - num(a.prevalence_rate));
          writer.write({
            type: 'data-hbar',
            data: {
              items: sorted.map((r: any) => ({
                label: r.crime_type,
                value: num(r.prevalence_rate),
              })),
            },
          });
          // Auto-scatter: prevalence vs cifra negra (safety net)
          const withBoth = rows.filter(
            (r: any) => r.prevalence_rate != null && r.cifra_negra != null,
          );
          if (withBoth.length >= 2) {
            writer.write({
              type: 'data-scatter',
              data: {
                points: withBoth.map((r: any) => ({
                  label: r.crime_type,
                  x: num(r.prevalence_rate),
                  y: num(r.cifra_negra),
                })),
                xLabel: 'Prevalencia (por 100k)',
                yLabel: 'Cifra negra (%)',
                xUnit: '', yUnit: '%', xDecimals: 0, yDecimals: 1,
                title: 'Prevalencia vs Cifra negra',
              },
            });
          }
        }
        break;
      }

      case 'get_mortality_causes': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          writer.write({
            type: 'data-hbar',
            data: {
              items: rows.map((r: any) => ({
                label: r.cause_group,
                value: num(r.rate_per_100k),
              })),
            },
          });
        }
        break;
      }

      case 'get_cifra_negra': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          const sorted = [...rows]
            .filter((r: any) => r.cifra_negra != null)
            .sort((a: any, b: any) => num(b.cifra_negra) - num(a.cifra_negra));
          // Detect which dimension varies: state vs crime type
          const uniqueGeos = new Set(sorted.map((r: any) => r.geo_code));
          const byState = uniqueGeos.size > 1;
          writer.write({
            type: 'data-hbar',
            data: {
              items: sorted.slice(0, 10).map((r: any) => ({
                label: byState ? stateName(r.geo_code) : (r.crime_type ?? r.geo_code),
                value: num(r.cifra_negra),
              })),
              valueFmt: '%',
            },
          });
        }
        break;
      }
    }
  } catch (e) {
    console.error('Chart extraction error:', e);
  }
}

// ── Route handler ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  ensureWarmed();
  const { messages }: { messages: UIMessage[] } = await req.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: SYSTEM_PROMPT,
        maxOutputTokens: 1024,
        stopWhen: stepCountIs(10),
        messages: await convertToModelMessages(messages),
        tools: {
          get_indicator_latest: tool({
            description:
              'Obtiene el valor m\u00e1s reciente de un indicador econ\u00f3mico, junto con el valor anterior para calcular cambios.',
            inputSchema: z.object({
              indicator_id: z.string().describe('ID del indicador (ej: inflacion_general, pib_real, tipo_cambio)'),
              geo: z.string().describe('C\u00f3digo geogr\u00e1fico (00 = nacional, 01-32 = estados). Default: 00').optional(),
            }),
            execute: async ({ indicator_id, geo }) => {
              const geoCode = geo || '00';
              const [values, indicator] = await Promise.all([
                getLatestValue(indicator_id, geoCode),
                getIndicator(indicator_id),
              ]);
              return {
                indicator_name: indicator?.name_es ?? indicator_id,
                source: indicator?.source ?? null,
                unit: indicator?.unit ?? null,
                frequency: indicator?.frequency ?? null,
                latest_value: values.latest?.value ?? null,
                latest_period: values.latest?.period ?? null,
                previous_value: values.previous?.value ?? null,
                previous_period: values.previous?.period ?? null,
              };
            },
          }),

          get_indicator_timeseries: tool({
            description:
              'Obtiene la serie de tiempo de un indicador \u2014 \u00fatil para ver tendencias hist\u00f3ricas.',
            inputSchema: z.object({
              indicator_id: z.string().describe('ID del indicador'),
              geo: z.string().describe('C\u00f3digo geogr\u00e1fico. Default: 00').optional(),
              limit: z.number().describe('N\u00famero de periodos recientes. Default: 24').optional(),
            }),
            execute: async ({ indicator_id, geo, limit }) => {
              const rows = await getIndicatorValues(indicator_id, geo || '00', limit || 24);
              const mapped = rows.map((r) => ({ period: r.period, value: r.value }));
              await writeChartParts(writer, 'get_indicator_timeseries', { indicator_id }, mapped);
              return mapped;
            },
          }),

          get_indicator_by_state: tool({
            description:
              'Obtiene el valor m\u00e1s reciente de un indicador para todos los estados \u2014 \u00fatil para rankings.',
            inputSchema: z.object({
              indicator_id: z.string().describe('ID del indicador'),
            }),
            execute: async ({ indicator_id }) => {
              const rows = await getIndicatorValuesByState(indicator_id, { latest: true });
              const mapped = rows.map((r) => ({
                state_name: r.geo_name,
                geo_code: r.geo_code,
                value: r.value,
                period: r.period,
              }));
              await writeChartParts(writer, 'get_indicator_by_state', { indicator_id }, mapped);
              return mapped;
            },
          }),

          search_indicators: tool({
            description:
              'Busca indicadores disponibles por nombre. \u00datil cuando no se sabe el ID exacto.',
            inputSchema: z.object({
              query: z.string().describe('T\u00e9rmino de b\u00fasqueda (ej: "inflaci\u00f3n", "empleo", "PIB")'),
            }),
            execute: async ({ query }) => {
              const all = await getIndicators();
              const q = query.toLowerCase();
              const matches = all.filter(
                (ind) =>
                  ind.name_es.toLowerCase().includes(q) ||
                  ind.topic.toLowerCase().includes(q) ||
                  (ind.subtopic && ind.subtopic.toLowerCase().includes(q)),
              );
              return matches.map((ind) => ({
                id: ind.id,
                name: ind.name_es,
                topic: ind.topic,
                unit: ind.unit,
                frequency: ind.frequency,
                source: ind.source,
              }));
            },
          }),

          get_employment_by_dimension: tool({
            description:
              'Estad\u00edsticas de empleo desglosadas por sector, edad, g\u00e9nero o educaci\u00f3n. Incluye informalidad, ingreso, horas.',
            inputSchema: z.object({
              dimension: z.enum(['sector', 'age_group', 'gender', 'education']).describe('Dimensi\u00f3n de desglose'),
              geo: z.string().describe('C\u00f3digo geogr\u00e1fico. Default: 00').optional(),
              quarter: z.string().describe('Trimestre espec\u00edfico (ej: "2024-Q3")').optional(),
            }),
            execute: async ({ dimension, geo, quarter }) => {
              const rows = await getEmploymentByDimension(dimension, geo || '00', quarter);
              const mapped = rows.map((r) => ({
                dimension_value: r.dimension_value,
                employed: r.employed,
                informal: r.informal,
                informality_rate: r.informality_rate,
                unemployment_rate: r.unemployment_rate,
                avg_hours_worked: r.avg_hours_worked,
                avg_monthly_income: r.avg_monthly_income,
                quarter: r.quarter,
              }));
              await writeChartParts(writer, 'get_employment_by_dimension', { dimension }, mapped);
              return mapped;
            },
          }),

          get_employment_trends: tool({
            description:
              'Tendencias nacionales de empleo: informalidad e ingreso promedio por trimestre.',
            inputSchema: z.object({}),
            execute: async () => {
              return await getEmploymentTrends();
            },
          }),

          get_cifra_negra: tool({
            description:
              'Cifra negra (% delitos no denunciados) y confianza institucional de la ENVIPE.',
            inputSchema: z.object({
              year: z.number().describe('A\u00f1o (ej: 2023)').optional(),
              geo: z.string().describe('C\u00f3digo geogr\u00e1fico').optional(),
            }),
            execute: async ({ year, geo }) => {
              const rows = await getCifraNegra(year, geo);
              const mapped = rows.map((r) => ({
                year: r.year,
                geo_code: r.geo_code,
                crime_type: r.crime_type,
                cifra_negra: r.cifra_negra,
                prevalence_rate: r.prevalence_rate,
                trust_police: r.trust_police,
                trust_military: r.trust_military,
                trust_judges: r.trust_judges,
              }));
              await writeChartParts(writer, 'get_cifra_negra', { year, geo }, mapped);
              return mapped;
            },
          }),

          get_crime_stats: tool({
            description:
              'Estad\u00edsticas de victimizaci\u00f3n por tipo de delito de la ENVIPE.',
            inputSchema: z.object({
              year: z.number().describe('A\u00f1o').optional(),
              geo: z.string().describe('C\u00f3digo geogr\u00e1fico').optional(),
              crime_type: z.string().describe('Tipo de delito espec\u00edfico').optional(),
            }),
            execute: async ({ year, geo, crime_type }) => {
              const rows = await getEnvipeStats(year, geo, crime_type);
              const mapped = rows.map((r) => ({
                year: r.year,
                geo_code: r.geo_code,
                crime_type: r.crime_type,
                prevalence_rate: r.prevalence_rate,
                reported_rate: r.reported_rate,
                cifra_negra: r.cifra_negra,
                cost_per_victim: r.cost_per_victim,
              }));
              await writeChartParts(writer, 'get_crime_stats', { year, geo, crime_type }, mapped);
              return mapped;
            },
          }),

          get_mortality_causes: tool({
            description:
              'Principales causas de muerte en M\u00e9xico con tasas por 100k habitantes.',
            inputSchema: z.object({
              year: z.number().describe('A\u00f1o. Default: 2023').optional(),
              geo: z.string().describe('C\u00f3digo geogr\u00e1fico. Default: 00').optional(),
            }),
            execute: async ({ year, geo }) => {
              const rows = await getLeadingCausesOfDeath(year || 2023, geo || '00');
              const mapped = rows.map((r) => ({
                cause_group: r.cause_group,
                deaths: r.deaths,
                rate_per_100k: r.rate_per_100k,
                year: r.year,
              }));
              await writeChartParts(writer, 'get_mortality_causes', { year, geo }, mapped);
              return mapped;
            },
          }),

          list_available_topics: tool({
            description:
              'Lista todos los temas disponibles con la cantidad de indicadores en cada uno.',
            inputSchema: z.object({}),
            execute: async () => {
              return await getTopicsWithCounts();
            },
          }),

          create_chart: tool({
            description:
              `Crea una gr\u00e1fica. SIEMPRE usa esta herramienta cuando el usuario pida una visualizaci\u00f3n espec\u00edfica o cuando quieras cruzar dos variables.

chart_type: "scatter" (x_field + y_field), "bar" (value_field), "strip" (value_field), "timeseries" (value_field)

Fuentes y sus campos:
- employment: dimension_value, informality_rate, unemployment_rate, avg_monthly_income, avg_hours_worked, employed, informal
- crime: crime_type, prevalence_rate, reported_rate, cifra_negra, cost_per_victim, trust_police
- cifra_negra: geo_code, crime_type, cifra_negra, trust_police, trust_military, trust_judges
- indicator_by_state: geo_name, value (requiere indicator_id)
- indicator_timeseries: period, value (requiere indicator_id)
- mortality: cause_group, deaths, rate_per_100k`,
            inputSchema: z.object({
              chart_type: z.enum(['bar', 'scatter', 'strip', 'timeseries']),
              source: z.enum(['employment', 'crime', 'cifra_negra', 'indicator_by_state', 'indicator_timeseries', 'mortality']),
              // Source-specific params (flat, all optional)
              indicator_id: z.string().describe('ID del indicador (para indicator_by_state / indicator_timeseries)').optional(),
              dimension: z.enum(['sector', 'age_group', 'gender', 'education']).describe('Dimensi\u00f3n de empleo').optional(),
              year: z.number().optional(),
              geo: z.string().optional(),
              quarter: z.string().optional(),
              crime_type: z.string().optional(),
              // Field mapping
              label_field: z.string().describe('Campo para etiquetas (ej: dimension_value, crime_type, geo_name, geo_code)'),
              value_field: z.string().describe('Campo num\u00e9rico para bar/strip/timeseries').optional(),
              x_field: z.string().describe('Campo num\u00e9rico eje X (scatter)').optional(),
              y_field: z.string().describe('Campo num\u00e9rico eje Y (scatter)').optional(),
              title: z.string().optional(),
              x_label: z.string().optional(),
              y_label: z.string().optional(),
              value_fmt: z.string().describe('Sufijo: "%" o "$"').optional(),
            }),
            execute: async ({ chart_type, source, indicator_id, dimension, year, geo, quarter, crime_type,
                              label_field, value_field, x_field, y_field, title, x_label, y_label, value_fmt }) => {
              try {
              // ── Fetch data ──────────────────────────────────────
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let rows: Record<string, any>[];
              switch (source) {
                case 'employment': {
                  const raw = await getEmploymentByDimension(dimension || 'sector', geo || '00', quarter);
                  rows = raw.map((r) => ({
                    dimension_value: r.dimension_value, employed: r.employed, informal: r.informal,
                    informality_rate: r.informality_rate, unemployment_rate: r.unemployment_rate,
                    avg_hours_worked: r.avg_hours_worked, avg_monthly_income: r.avg_monthly_income,
                  }));
                  break;
                }
                case 'crime': {
                  const raw = await getEnvipeStats(year, geo, crime_type);
                  rows = raw.map((r) => ({
                    crime_type: r.crime_type, geo_code: r.geo_code,
                    prevalence_rate: r.prevalence_rate, reported_rate: r.reported_rate,
                    cifra_negra: r.cifra_negra, cost_per_victim: r.cost_per_victim,
                    trust_police: r.trust_police,
                  }));
                  break;
                }
                case 'cifra_negra': {
                  const raw = await getCifraNegra(year, geo);
                  rows = raw.map((r) => ({
                    crime_type: r.crime_type, geo_code: r.geo_code,
                    cifra_negra: r.cifra_negra, prevalence_rate: r.prevalence_rate,
                    trust_police: r.trust_police, trust_military: r.trust_military, trust_judges: r.trust_judges,
                  }));
                  break;
                }
                case 'indicator_by_state': {
                  if (!indicator_id) return { error: 'indicator_id es requerido para indicator_by_state' };
                  const raw = await getIndicatorValuesByState(indicator_id, { latest: true });
                  rows = raw.map((r) => ({ geo_name: r.geo_name, geo_code: r.geo_code, value: r.value }));
                  break;
                }
                case 'indicator_timeseries': {
                  if (!indicator_id) return { error: 'indicator_id es requerido para indicator_timeseries' };
                  const raw = await getIndicatorValues(indicator_id, geo || '00', 24);
                  rows = raw.map((r) => ({ period: r.period, value: r.value }));
                  break;
                }
                case 'mortality': {
                  const raw = await getLeadingCausesOfDeath(year || 2023, geo || '00');
                  rows = raw.map((r) => ({ cause_group: r.cause_group, deaths: r.deaths, rate_per_100k: r.rate_per_100k }));
                  break;
                }
                default:
                  return { error: `Fuente desconocida: ${source}` };
              }

              if (!rows.length) return { error: 'No hay datos para estos par\u00e1metros' };

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const resolveLabel = (row: Record<string, any>): string => {
                const raw = row[label_field];
                if (label_field === 'geo_code' && typeof raw === 'string') return stateName(raw);
                return String(raw ?? '');
              };

              // ── Build chart ─────────────────────────────────────
              switch (chart_type) {
                case 'bar': {
                  const vf = value_field || 'value';
                  let items = rows.filter((r) => r[vf] != null).map((r) => ({ label: resolveLabel(r), value: num(r[vf]) }));
                  items.sort((a, b) => b.value - a.value);
                  items = items.slice(0, 15);
                  writer.write({ type: 'data-hbar', data: { items, valueFmt: value_fmt, title } });
                  return { chart: 'bar', count: items.length };
                }
                case 'scatter': {
                  if (!x_field || !y_field) return { error: 'scatter requiere x_field y y_field' };
                  const pts = rows.filter((r) => r[x_field] != null && r[y_field] != null)
                    .map((r) => ({ label: resolveLabel(r), x: num(r[x_field]), y: num(r[y_field]) }));
                  if (pts.length < 2) return { error: 'No hay suficientes datos para scatter' };
                  writer.write({
                    type: 'data-scatter',
                    data: { points: pts, xLabel: x_label || x_field, yLabel: y_label || y_field,
                            xUnit: value_fmt || '', yUnit: '', xDecimals: 1, yDecimals: 1, title },
                  });
                  return { chart: 'scatter', count: pts.length };
                }
                case 'strip': {
                  const vf = value_field || 'value';
                  const pts = rows.filter((r) => r[vf] != null).map((r) => ({ label: resolveLabel(r), value: num(r[vf]) }));
                  if (pts.length < 3) return { error: 'No hay suficientes datos para strip' };
                  pts.sort((a, b) => b.value - a.value);
                  writer.write({ type: 'data-dotstrip', data: { points: pts, unit: value_fmt || '', title } });
                  return { chart: 'strip', count: pts.length };
                }
                case 'timeseries': {
                  const vf = value_field || 'value';
                  const values = rows.map((r) => num(r[vf]));
                  const periods = rows.map((r) => String(r[label_field] ?? ''));
                  const labels = periods.map((p, i) => formatPeriodLabel(p, i));
                  let chartLabel = title || 'Serie de tiempo';
                  if (source === 'indicator_timeseries' && indicator_id) {
                    try { const ind = await getIndicator(indicator_id); if (ind?.name_es) chartLabel = ind.name_es; } catch {}
                  }
                  writer.write({ type: 'data-timeseries', data: { values, labels, periods, label: chartLabel, color: '#FF9F43' } });
                  return { chart: 'timeseries', count: values.length };
                }
                default:
                  return { error: `Tipo desconocido: ${chart_type}` };
              }
              } catch (error) {
                console.error('create_chart error:', error);
                return { error: `Error: ${error instanceof Error ? error.message : 'desconocido'}` };
              }
            },
          }),
        },
      });

      await writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
