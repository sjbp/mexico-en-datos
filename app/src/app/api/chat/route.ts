import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  getIndicators,
  getIndicator,
  getIndicatorValues,
  getLatestValue,
  getIndicatorValuesByState,
  getTopicsWithCounts,
  getEmploymentByDimension,
  getEmploymentTrends,
  getCifraNegra,
  getEnvipeStats,
  getLeadingCausesOfDeath,
} from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ── Block types for structured chat responses ──────────────────────────

type Block =
  | { type: 'text'; content: string }
  | { type: 'sparkline'; data: { values: number[]; label: string; color?: string } }
  | { type: 'hbar'; data: { items: { label: string; value: number; color?: string }[]; valueFmt?: string } }
  | { type: 'timeseries'; data: { values: number[]; labels: string[]; periods: string[]; label: string; color?: string; yUnit?: string } };

/** Safely coerce a DB value (possibly string) to number */
function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Format a period string like "2024/03" into a readable x-axis label.
 *  Shows "Ene 2024" at January, just "Abr" for other months, "2024/Q1" for quarters. */
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function formatPeriodLabel(period: string, index: number, _total: number): string {
  if (!period) return '';
  // Quarterly: "2024/Q1" → "2024 Q1"
  if (period.includes('Q')) return period.replace('/', ' ');

  let year: string;
  let month: number;

  // Handle "2024/03" format
  if (period.includes('/')) {
    const parts = period.split('/');
    year = parts[0];
    month = parseInt(parts[1], 10);
  // Handle "2024-03-01" date format
  } else if (period.includes('-')) {
    const parts = period.split('-');
    year = parts[0];
    month = parseInt(parts[1], 10);
  } else {
    return period;
  }

  if (isNaN(month)) return period;
  const monthName = MONTH_NAMES[month - 1] || '';
  // Show "Ene 24" at January or first data point; just month otherwise
  if (month === 1 || index === 0) return `${monthName} ${year.slice(-2)}`;
  return monthName;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractChartBlocks(toolName: string, toolInput: any, toolResult: any): Promise<Block[]> {
  const blocks: Block[] = [];

  if (!toolResult || toolResult.error) return blocks;

  try {
    switch (toolName) {
      case 'get_indicator_timeseries': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 5) {
          const values = rows.map((r: any) => num(r.value));
          // Use period field (e.g., "2024/03") if available, fall back to period_date
          const periods = rows.map((r: any) => r.period ?? r.period_date ?? '');
          const labels = periods.map((p: string, i: number) => formatPeriodLabel(p, i, periods.length));

          // Fetch the indicator name for a proper label
          let chartLabel = 'Serie de tiempo';
          try {
            const indicator = await getIndicator(toolInput.indicator_id);
            if (indicator?.name_es) chartLabel = indicator.name_es;
          } catch { /* fallback to default */ }

          blocks.push({
            type: 'timeseries',
            data: {
              values,
              labels,
              periods,
              label: chartLabel,
              color: '#FF9F43',
            },
          });
        }
        break;
      }

      case 'get_indicator_by_state': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 5) {
          const sorted = [...rows]
            .filter((r: any) => r.value != null)
            .sort((a: any, b: any) => num(b.value) - num(a.value))
            .slice(0, 10);
          blocks.push({
            type: 'hbar',
            data: {
              items: sorted.map((r: any) => ({
                label: r.geo_name ?? r.state_name ?? r.geo_code,
                value: num(r.value),
              })),
            },
          });
        }
        break;
      }

      case 'get_employment_by_dimension': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          const sorted = [...rows]
            .filter((r: any) => r.informality_rate != null)
            .sort((a: any, b: any) => num(b.informality_rate) - num(a.informality_rate));
          blocks.push({
            type: 'hbar',
            data: {
              items: sorted.map((r: any) => ({
                label: r.dimension_value,
                value: num(r.informality_rate),
              })),
              valueFmt: '%',
            },
          });
        }
        break;
      }

      case 'get_crime_stats': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          const sorted = [...rows]
            .filter((r: any) => r.prevalence_rate != null)
            .sort((a: any, b: any) => num(b.prevalence_rate) - num(a.prevalence_rate));
          blocks.push({
            type: 'hbar',
            data: {
              items: sorted.map((r: any) => ({
                label: r.crime_type,
                value: num(r.prevalence_rate),
              })),
            },
          });
        }
        break;
      }

      case 'get_mortality_causes': {
        const rows = Array.isArray(toolResult) ? toolResult : [];
        if (rows.length >= 2) {
          blocks.push({
            type: 'hbar',
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
          blocks.push({
            type: 'hbar',
            data: {
              items: sorted.slice(0, 10).map((r: any) => ({
                label: r.crime_type ?? r.geo_code,
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

  return blocks;
}

const SYSTEM_PROMPT = `Eres el asistente de datos de México en Datos, una plataforma de datos públicos de México.

Tu trabajo es responder preguntas sobre la economía, empleo, seguridad, salud y otros indicadores de México usando datos reales de fuentes oficiales (INEGI, Banxico, SESNSP, CONEVAL).

Reglas:
1. Responde siempre en español, de forma concisa y directa.
2. Lidera con el dato numérico, después da contexto.
3. SIEMPRE cita la fuente (INEGI, Banxico, SESNSP, etc.) y el periodo del dato.
4. Cuando menciones un indicador específico, incluye un link en formato: [nombre del indicador](/indicador/ID)
5. Si no tienes datos para responder, dilo honestamente y sugiere qué datos sí están disponibles.
6. No inventes datos. Solo usa los que obtengas de las herramientas.
7. Usa formato markdown para estructurar respuestas largas.
8. Para comparaciones entre estados o sectores, presenta los datos en tablas.
9. Sé conversacional pero preciso — como un analista de datos explicándole a un periodista.

Datos disponibles:
- Indicadores macroeconómicos: inflación (Banxico), PIB, IGAE, tipo de cambio, tasa de interés, confianza del consumidor
- Empleo: desocupación, informalidad, subocupación, PEA, desglose por sector/edad/género/educación (ENOE)
- Comercio: exportaciones e importaciones totales mensuales
- Seguridad: homicidios dolosos por estado (SESNSP), cifra negra, victimización por tipo de delito (ENVIPE)
- Salud: principales causas de muerte con tasas por 100 mil habitantes (mortalidad INEGI 2023)`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_indicator_latest',
    description:
      'Obtiene el valor más reciente de un indicador económico, junto con el valor anterior para calcular cambios. Indicadores disponibles incluyen inflación, PIB, IGAE, tipo de cambio, tasa de interés, confianza del consumidor, exportaciones, importaciones, homicidios dolosos, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        indicator_id: {
          type: 'string',
          description: 'ID del indicador (ej: inflacion_general, pib_real, tipo_cambio, igae, tasa_interes, confianza_consumidor, exportaciones_totales, importaciones_totales, homicidios_dolosos)',
        },
        geo: {
          type: 'string',
          description: 'Código geográfico (00 = nacional, 01-32 = estados). Default: 00',
        },
      },
      required: ['indicator_id'],
    },
  },
  {
    name: 'get_indicator_timeseries',
    description:
      'Obtiene la serie de tiempo de un indicador — útil para ver tendencias históricas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        indicator_id: { type: 'string', description: 'ID del indicador' },
        geo: { type: 'string', description: 'Código geográfico. Default: 00' },
        limit: {
          type: 'number',
          description: 'Número de periodos recientes a obtener. Default: 24',
        },
      },
      required: ['indicator_id'],
    },
  },
  {
    name: 'get_indicator_by_state',
    description:
      'Obtiene el valor más reciente de un indicador para todos los estados — útil para rankings y comparaciones geográficas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        indicator_id: { type: 'string', description: 'ID del indicador' },
      },
      required: ['indicator_id'],
    },
  },
  {
    name: 'search_indicators',
    description:
      'Busca indicadores disponibles por nombre. Útil cuando no se sabe el ID exacto de un indicador.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda (ej: "inflación", "empleo", "PIB")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_employment_by_dimension',
    description:
      'Obtiene estadísticas de empleo desglosadas por una dimensión: sector económico, grupo de edad, género o nivel educativo. Incluye tasas de informalidad, ingreso promedio, horas trabajadas, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dimension: {
          type: 'string',
          enum: ['sector', 'age_group', 'gender', 'education'],
          description: 'Dimensión de desglose',
        },
        geo: { type: 'string', description: 'Código geográfico. Default: 00' },
        quarter: {
          type: 'string',
          description: 'Trimestre específico (ej: "2024-Q3"). Si no se indica, se usa el más reciente.',
        },
      },
      required: ['dimension'],
    },
  },
  {
    name: 'get_employment_trends',
    description:
      'Obtiene tendencias nacionales de empleo: tasa de informalidad e ingreso promedio por trimestre.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_cifra_negra',
    description:
      'Obtiene la cifra negra (porcentaje de delitos no denunciados) y estadísticas de confianza institucional de la ENVIPE.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: { type: 'number', description: 'Año (ej: 2023)' },
        geo: { type: 'string', description: 'Código geográfico' },
      },
      required: [],
    },
  },
  {
    name: 'get_crime_stats',
    description:
      'Obtiene estadísticas de victimización por tipo de delito de la ENVIPE: prevalencia, tasa de denuncia, costo por víctima.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: { type: 'number', description: 'Año' },
        geo: { type: 'string', description: 'Código geográfico' },
        crime_type: { type: 'string', description: 'Tipo de delito específico' },
      },
      required: [],
    },
  },
  {
    name: 'get_mortality_causes',
    description:
      'Obtiene las principales causas de muerte en México con tasas por 100 mil habitantes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: { type: 'number', description: 'Año. Default: 2023' },
        geo: { type: 'string', description: 'Código geográfico. Default: 00' },
      },
      required: [],
    },
  },
  {
    name: 'list_available_topics',
    description:
      'Lista todos los temas disponibles con la cantidad de indicadores en cada uno. Útil para saber qué datos hay disponibles.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: Record<string, any>): Promise<unknown> {
  try {
    switch (name) {
      case 'get_indicator_latest': {
        const geo = input.geo || '00';
        const [values, indicator] = await Promise.all([
          getLatestValue(input.indicator_id, geo),
          getIndicator(input.indicator_id),
        ]);
        return {
          indicator_name: indicator?.name_es ?? input.indicator_id,
          source: indicator?.source ?? null,
          unit: indicator?.unit ?? null,
          frequency: indicator?.frequency ?? null,
          latest_value: values.latest?.value ?? null,
          latest_period: values.latest?.period ?? null,
          previous_value: values.previous?.value ?? null,
          previous_period: values.previous?.period ?? null,
        };
      }

      case 'get_indicator_timeseries': {
        const geo = input.geo || '00';
        const limit = input.limit || 24;
        const rows = await getIndicatorValues(input.indicator_id, geo, limit);
        return rows.map((r) => ({ period: r.period, value: r.value }));
      }

      case 'get_indicator_by_state': {
        const rows = await getIndicatorValuesByState(input.indicator_id, { latest: true });
        return rows.map((r) => ({
          state_name: r.geo_name,
          geo_code: r.geo_code,
          value: r.value,
          period: r.period,
        }));
      }

      case 'search_indicators': {
        const all = await getIndicators();
        const q = (input.query as string).toLowerCase();
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
      }

      case 'get_employment_by_dimension': {
        const geo = input.geo || '00';
        const rows = await getEmploymentByDimension(input.dimension, geo, input.quarter);
        return rows.map((r) => ({
          dimension_value: r.dimension_value,
          employed: r.employed,
          informal: r.informal,
          informality_rate: r.informality_rate,
          unemployment_rate: r.unemployment_rate,
          avg_hours_worked: r.avg_hours_worked,
          avg_monthly_income: r.avg_monthly_income,
          quarter: r.quarter,
        }));
      }

      case 'get_employment_trends': {
        return await getEmploymentTrends();
      }

      case 'get_cifra_negra': {
        const rows = await getCifraNegra(input.year, input.geo);
        return rows.map((r) => ({
          year: r.year,
          geo_code: r.geo_code,
          cifra_negra: r.cifra_negra,
          prevalence_rate: r.prevalence_rate,
          trust_police: r.trust_police,
          trust_military: r.trust_military,
          trust_judges: r.trust_judges,
        }));
      }

      case 'get_crime_stats': {
        const rows = await getEnvipeStats(input.year, input.geo, input.crime_type);
        return rows.map((r) => ({
          year: r.year,
          geo_code: r.geo_code,
          crime_type: r.crime_type,
          prevalence_rate: r.prevalence_rate,
          reported_rate: r.reported_rate,
          cifra_negra: r.cifra_negra,
          cost_per_victim: r.cost_per_victim,
        }));
      }

      case 'get_mortality_causes': {
        const year = input.year || 2023;
        const geo = input.geo || '00';
        const rows = await getLeadingCausesOfDeath(year, geo);
        return rows.map((r) => ({
          cause_group: r.cause_group,
          deaths: r.deaths,
          rate_per_100k: r.rate_per_100k,
          year: r.year,
        }));
      }

      case 'list_available_topics': {
        return await getTopicsWithCounts();
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error);
    return { error: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 },
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build conversation messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversationMessages: any[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    // Track tool calls for chart extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCallLog: { name: string; input: any; result: any }[] = [];

    // Tool use loop — keep calling Claude until we get a final text response
    const MAX_ROUNDS = 10;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversationMessages,
      });

      // Check if we have tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls — extract charts from collected tool results and return blocks
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === 'text',
        );
        const textContent = textBlock?.text ?? '';

        const chartBlocks: Block[] = [];
        for (const call of toolCallLog) {
          chartBlocks.push(...await extractChartBlocks(call.name, call.input, call.result));
        }

        return NextResponse.json({
          blocks: [
            { type: 'text', content: textContent },
            ...chartBlocks,
          ],
        });
      }

      // Execute tool calls and build results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults: any[] = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolCallLog.push({ name: block.name, input: block.input, result });
        toolResults.push({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Add assistant response and tool results to conversation
      conversationMessages.push({ role: 'assistant', content: response.content });
      conversationMessages.push({ role: 'user', content: toolResults });
    }

    // If we exhausted rounds, return what we have
    return NextResponse.json({
      blocks: [
        { type: 'text', content: 'Lo siento, no pude completar la consulta. Intenta con una pregunta más específica.' },
      ],
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Error procesando la consulta' },
      { status: 500 },
    );
  }
}
