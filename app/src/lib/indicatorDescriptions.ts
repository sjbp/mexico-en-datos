export const INDICATOR_DESCRIPTIONS: Record<string, { summary: string; context: string; staleWarning?: string }> = {
  // --- Banxico series ---
  "SP30578": {
    summary: "Variacion porcentual anual del Indice Nacional de Precios al Consumidor. Es la cifra de inflacion que se reporta en las noticias.",
    context: "El objetivo de Banxico es 3% +/- 1pp. Valores por encima de 4% indican presion inflacionaria; por debajo de 2% sugieren debilidad economica. Es el dato mas vigilado para decisiones de politica monetaria."
  },
  "SF43718": {
    summary: "Tipo de cambio FIX pesos por dolar, determinado diariamente por el Banco de Mexico.",
    context: "Es la referencia oficial para operaciones en dolares en Mexico. El numero economico mas vigilado del pais. Un peso fuerte favorece importaciones; uno debil favorece exportaciones y remesas."
  },
  "SF61745": {
    summary: "Tasa de interes objetivo de politica monetaria, fijada por la Junta de Gobierno de Banxico.",
    context: "Afecta directamente hipotecas, ahorro y credito. Banxico la ajusta para controlar la inflacion. Subidas encarecen el credito; recortes lo abaratan. Se decide en juntas aproximadamente cada 6 semanas."
  },
  "SP1": {
    summary: "Indice Nacional de Precios al Consumidor, base segunda quincena de julio 2018 = 100. Serie de Banxico.",
    context: "Mismo indice que publica INEGI pero a traves de Banxico, que suele mantener la serie mas actualizada. Mide el costo de una canasta representativa de bienes y servicios."
  },
  "SP74662": {
    summary: "Variacion porcentual anual del INPC excluyendo productos con precios volatiles (agropecuarios y energeticos/tarifas de gobierno).",
    context: "La inflacion subyacente refleja presiones de demanda mas que choques de oferta. Es la medida preferida de Banxico para evaluar la tendencia inflacionaria de mediano plazo."
  },

  // --- Prices (historical, frozen Jul 2024) ---
  "628194": {
    summary: "Indice general de precios al consumidor, base 2a quincena de julio 2018 = 100. Serie historica congelada en julio 2024.",
    context: "INEGI migro el INPC a una nueva canasta y ponderadores en 2024. Esta serie ya no se actualiza. Los datos actuales de inflacion se publicaran via Banxico proximamente.",
    staleWarning: "Esta serie fue congelada en julio 2024 por la migracion del INPC de INEGI. Para datos actuales de inflacion, consulta [Inflacion General Anual (Banxico)](/indicador/SP30578)."
  },

  // --- Economic Activity ---
  "735904": {
    summary: "Variacion porcentual anual del Producto Interno Bruto de Mexico, a precios constantes de 2018.",
    context: "Es la medida mas amplia de crecimiento economico. Mexico es la 12a economia mundial. Un valor positivo indica expansion; negativo indica contraccion (recesion). Se publica con ~2 trimestres de rezago."
  },
  "736939": {
    summary: "Indicador mensual que estima la evolucion de la actividad economica total, con metodologia compatible con el PIB.",
    context: "Permite dar seguimiento mensual a la economia cuando el PIB solo se publica trimestralmente. Cubre los tres grandes sectores: primario, secundario y terciario."
  },
  "736940": {
    summary: "Cambio porcentual del IGAE respecto al mismo mes del ano anterior.",
    context: "Indica si la economia esta creciendo o contrayendose en terminos anuales. Valores negativos senalan recesion."
  },
  "736883": {
    summary: "Indice mensual de actividades secundarias (industria): manufactura, construccion, mineria y electricidad.",
    context: "El sector secundario representa ~30% del PIB. La manufactura de exportacion es un motor clave de la economia mexicana."
  },
  "736941": {
    summary: "Indice mensual de actividades primarias: agricultura, ganaderia, pesca y aprovechamiento forestal.",
    context: "El sector primario es altamente estacional y volatil, dependiente del clima y ciclos de cosecha. Representa ~4% del PIB pero emplea al 12% de la poblacion."
  },
  "736895": {
    summary: "Indice mensual de actividades terciarias: comercio, servicios financieros, transporte, educacion, salud y gobierno.",
    context: "El sector terciario es el mas grande de la economia mexicana (~63% del PIB). Su crecimiento refleja la urbanizacion y modernizacion economica del pais."
  },

  // --- Employment (post-migration IDs, 32 cities urban aggregate) ---
  "444612": {
    summary: "Porcentaje de la Poblacion Economicamente Activa urbana que no tiene trabajo pero lo busca activamente. Agregado de 32 ciudades.",
    context: "En Mexico la tasa urbana de desempleo tiende a ser baja (~3-5%). Se complementa con la tasa de informalidad y subocupacion para entender el panorama completo del mercado laboral."
  },
  "444619": {
    summary: "Porcentaje de la poblacion ocupada urbana en condiciones de informalidad laboral (sin acceso a seguridad social por su trabajo).",
    context: "Cerca del 44% de los trabajadores urbanos son informales. A nivel nacional (incluyendo zonas rurales) la cifra supera el 55%. Es una de las metricas mas reveladoras del mercado laboral mexicano."
  },
  "444616": {
    summary: "Porcentaje de la poblacion ocupada urbana que tiene necesidad y disponibilidad de trabajar mas horas.",
    context: "Complementa la tasa de desempleo mostrando subempleo: personas que trabajan pero no las horas suficientes para cubrir sus necesidades."
  },
  "444620": {
    summary: "Porcentaje de la poblacion de 15 anos y mas que trabaja o busca activamente un empleo, en el agregado de 32 ciudades.",
    context: "Mide la participacion laboral urbana. Su crecimiento refleja cambios demograficos, mayor participacion femenina y dinamica economica."
  },

  // --- Trade ---
  "127598": {
    summary: "Valor total de las mercancias vendidas al exterior, en millones de dolares.",
    context: "Mexico es el principal socio comercial de EE.UU. Las exportaciones manufactureras (especialmente automotriz y electronica) representan ~90% del total."
  },
  "127601": {
    summary: "Valor total de las mercancias compradas del exterior, en millones de dolares.",
    context: "Incluye bienes intermedios para manufactura, bienes de consumo y bienes de capital. El deficit o superavit comercial se calcula contra las exportaciones."
  },

  // --- Security (SESNSP) ---
  "sesnsp_homicide_rate": {
    summary: "Tasa anual de homicidios dolosos por cada 100 mil habitantes, calculada a partir de las carpetas de investigacion reportadas por las procuradurias estatales al SESNSP.",
    context: "Mide la violencia letal intencional. Mexico alcanzo su pico en 2018-2019 (~29 por 100k). Valores por debajo de 15 se consideran altos a nivel internacional pero representan una mejora relativa para Mexico. Solo captura casos denunciados; la cifra real es mayor."
  },
  "sesnsp_homicide_count": {
    summary: "Numero mensual de carpetas de investigacion por homicidio doloso, reportadas por las fiscalias estatales al Secretariado Ejecutivo del SESNSP.",
    context: "Permite dar seguimiento mensual a la tendencia de violencia homicida. Es la fuente oficial mas oportuna para homicidios en Mexico. Los datos se publican con ~2 meses de rezago."
  },

  // --- Confidence ---
  "454168": {
    summary: "Indice compuesto que mide la percepcion de los consumidores sobre la situacion economica actual y futura del pais y del hogar.",
    context: "Basado en la Encuesta Nacional sobre Confianza del Consumidor (ENCO). Valores por encima de 50 indican optimismo. Es un indicador adelantado del consumo privado."
  },
};

export function getIndicatorDescription(id: string): { summary: string; context: string; staleWarning?: string } | null {
  return INDICATOR_DESCRIPTIONS[id] ?? null;
}
