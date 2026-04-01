import Breadcrumb from '@/components/ui/Breadcrumb';
import ExploradorClient from '../ExploradorClient';
import { getIndicators, getTopicsWithCounts } from '@/lib/data';

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
  const topicDisplay = topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

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
