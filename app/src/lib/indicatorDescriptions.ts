export const INDICATOR_DESCRIPTIONS: Record<string, { summary: string; context: string }> = {
  "628194": {
    summary: "Variacion porcentual anual del Indice Nacional de Precios al Consumidor, publicado quincenalmente.",
    context: "Es la medida mas seguida de inflacion en Mexico. Un valor alto indica perdida de poder adquisitivo. Banxico tiene un objetivo de 3% +/- 1pp."
  },
  "628229": {
    summary: "Variacion anual del INPC excluyendo productos agropecuarios y energeticos, cuyos precios son mas volatiles.",
    context: "Refleja la tendencia de fondo de los precios. Es clave para las decisiones de politica monetaria de Banxico."
  },
  "444612": {
    summary: "Indice base 2da quincena de julio 2018 = 100 que mide la evolucion de los precios de una canasta de bienes y servicios representativa del consumo de los hogares mexicanos.",
    context: "Es el indicador oficial de nivel de precios en Mexico. Se construye con ~300,000 cotizaciones mensuales en 55 ciudades."
  },
  "444613": {
    summary: "Indice de precios que excluye los bienes y servicios con precios mas volatiles (agropecuarios y energeticos).",
    context: "Muestra la inflacion estructural, sin el ruido de choques temporales de oferta. Banxico lo monitorea de cerca."
  },
  "444616": {
    summary: "Subindice del INPC que mide la evolucion de precios de alimentos, bebidas y tabaco.",
    context: "Es el componente que mas impacta a los hogares de menores ingresos, donde la alimentacion representa mayor proporcion del gasto."
  },
  "444618": {
    summary: "Subindice del INPC que mide la evolucion de precios de transporte publico y privado.",
    context: "Incluye gasolinas, transporte publico, vehiculos y refacciones. Sensible a precios internacionales del petroleo."
  },
  "444619": {
    summary: "Subindice del INPC que mide la evolucion de precios de servicios medicos, medicamentos y articulos de cuidado personal.",
    context: "Historicamente crece por encima de la inflacion general. Relevante para seguros de salud y presupuestos familiares."
  },
  "444620": {
    summary: "Subindice del INPC que mide la evolucion de precios de vivienda, incluyendo rentas, mantenimiento y servicios.",
    context: "Componente con alta ponderacion en el INPC. Incluye rentas de vivienda, electricidad, gas y agua."
  },
  "444621": {
    summary: "Subindice del INPC que mide la evolucion de precios de servicios educativos y articulos escolares.",
    context: "Presenta estacionalidad marcada por los ciclos escolares. Las colegiaturas privadas son un componente importante."
  },
  "735904": {
    summary: "Valor total de la produccion de bienes y servicios finales en Mexico, medido trimestralmente a precios de 2018.",
    context: "Es la medida mas amplia de actividad economica. Mexico es la 12a economia mundial. Tasas de crecimiento del PIB se pueden calcular a partir de esta serie."
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
  "444614": {
    summary: "Porcentaje de la Poblacion Economicamente Activa que no tiene trabajo pero lo busca activamente.",
    context: "En Mexico la tasa oficial tiende a ser baja (~3-4%) porque no captura la informalidad. Se complementa con la tasa de informalidad y subocupacion."
  },
  "444793": {
    summary: "Porcentaje de la poblacion ocupada en condiciones de informalidad laboral (sin acceso a seguridad social por su trabajo).",
    context: "Cerca del 55% de los trabajadores mexicanos son informales. Es una de las cifras mas reveladoras del mercado laboral en Mexico."
  },
  "444894": {
    summary: "Porcentaje de la poblacion ocupada que tiene necesidad y disponibilidad de trabajar mas horas.",
    context: "Complementa la tasa de desempleo mostrando subempleo: personas que trabajan pero no las horas suficientes."
  },
  "444609": {
    summary: "Numero de personas de 15 anos o mas que trabajan o buscan activamente un empleo.",
    context: "Mide el tamano de la fuerza laboral mexicana. Su crecimiento refleja cambios demograficos y de participacion laboral."
  },
  "127598": {
    summary: "Valor total de las mercancias vendidas al exterior, en millones de dolares.",
    context: "Mexico es el principal socio comercial de EE.UU. Las exportaciones manufactureras (especialmente automotriz y electronica) representan ~90% del total."
  },
  "127601": {
    summary: "Valor total de las mercancias compradas del exterior, en millones de dolares.",
    context: "Incluye bienes intermedios para manufactura, bienes de consumo y bienes de capital. El deficit o superavit comercial se calcula contra las exportaciones."
  }
};

export function getIndicatorDescription(id: string): { summary: string; context: string } | null {
  return INDICATOR_DESCRIPTIONS[id] ?? null;
}
