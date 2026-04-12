import Hero from './sections/Hero';
import HeadlineGrid from './sections/HeadlineGrid';
import TopicsGrid from './sections/TopicsGrid';
import SourcesGrid from './sections/SourcesGrid';
import { getHeadlineIndicators } from '@/lib/data';

export default async function Home() {
  const headlines = await getHeadlineIndicators();

  return (
    <>
      <Hero />
      <HeadlineGrid headlines={headlines} />
      <TopicsGrid />
      <SourcesGrid />

      {/* Dataset structured data for Google Dataset Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'M\u00e9xico en Datos \u2014 Indicadores p\u00fablicos de M\u00e9xico',
            description: 'Colecci\u00f3n de indicadores econ\u00f3micos, de empleo, seguridad y salud de M\u00e9xico provenientes de fuentes oficiales (INEGI, Banxico, SESNSP, ENOE, ENVIPE, Secretar\u00eda de Salud, ENSANUT).',
            url: 'https://datamx.sebastian.mx',
            license: 'https://www.inegi.org.mx/contenidos/inegi/doc/terminos_info.pdf',
            creator: { '@type': 'Person', name: 'Sebasti\u00e1n Blanco', url: 'https://www.linkedin.com/in/sebastianjbp/' },
            temporalCoverage: '2015/..',
            spatialCoverage: { '@type': 'Place', name: 'M\u00e9xico' },
            variableMeasured: [
              'Inflaci\u00f3n', 'PIB', 'Tipo de cambio', 'TIIE', 'Desempleo',
              'Informalidad laboral', 'Homicidios', 'Cifra negra', 'Mortalidad',
            ],
            distribution: {
              '@type': 'DataDownload',
              encodingFormat: 'application/json',
              contentUrl: 'https://datamx.sebastian.mx/api/indicators',
            },
          }),
        }}
      />
    </>
  );
}
