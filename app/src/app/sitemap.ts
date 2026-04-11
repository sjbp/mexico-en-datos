import type { MetadataRoute } from 'next';
import { getIndicators } from '@/lib/data';
import { SOURCES } from '@/lib/sources';

const SITE_URL = 'https://datamx.sebastian.mx';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const indicators = await getIndicators();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/economia`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/empleo`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/empleo/informalidad`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/empleo/salarios`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/seguridad`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/salud`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/comercio`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/explorador`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/comparar`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/fuentes`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const sourcePages: MetadataRoute.Sitemap = SOURCES.map((s) => ({
    url: `${SITE_URL}/fuentes/${s.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const indicatorPages: MetadataRoute.Sitemap = indicators.map((ind) => ({
    url: `${SITE_URL}/indicador/${ind.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...sourcePages, ...indicatorPages];
}
