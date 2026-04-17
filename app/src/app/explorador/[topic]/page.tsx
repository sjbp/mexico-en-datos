import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import ExploradorClient from '../ExploradorClient';
import { getIndicators, getTopicsWithCounts } from '@/lib/data';
import { fmtTopic } from '@/lib/format';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const topicDisplay = fmtTopic(topic);
  return {
    title: `${topicDisplay} | Explorador | M\u00e9xico en Datos`,
    description: `Indicadores de ${topicDisplay} en M\u00e9xico con datos oficiales y gr\u00e1ficas interactivas.`,
    alternates: { canonical: `/explorador/${topic}` },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;

  const [indicators, topics] = await Promise.all([
    getIndicators(),
    getTopicsWithCounts(),
  ]);

  const topicExists = topics.some((t) => t.topic === topic);
  const topicDisplay = fmtTopic(topic);

  if (!topicExists) {
    return (
      <div className="pt-10 px-[var(--pad-page)]">
        <h1 className="text-2xl font-bold text-white mb-2">Tema no encontrado</h1>
        <p className="text-[var(--text-muted)]">
          El tema &quot;{topic}&quot; no existe.{' '}
          <a href="/explorador" className="text-[var(--accent)] underline">
            Volver al explorador
          </a>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="pt-10 pb-4 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Explorador', href: '/explorador' },
            { label: topicDisplay },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {topicDisplay}
        </h1>
      </div>
      <ExploradorClient indicators={indicators} topics={topics} initialTopic={topic} />
    </>
  );
}
