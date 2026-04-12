import ExploradorClient from './ExploradorClient';
import { getIndicators, getTopicsWithCounts } from '@/lib/data';

export const metadata = {
  title: 'Explorador de Indicadores',
  description: 'Cat\u00e1logo completo de indicadores macroecon\u00f3micos de M\u00e9xico.',
};

export default async function ExploradorPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const [indicators, topics] = await Promise.all([
    getIndicators(),
    getTopicsWithCounts(),
  ]);

  return (
    <>
      <div className="pt-10 pb-6 px-[var(--pad-page)]">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Explorador de indicadores
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-[600px]">
          Cat&aacute;logo completo de indicadores macroecon&oacute;micos de M&eacute;xico.
        </p>
      </div>
      <ExploradorClient indicators={indicators} topics={topics} initialTopic={topic} />
    </>
  );
}
