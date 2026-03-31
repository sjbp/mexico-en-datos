import Footer from '@/components/ui/Footer';
import ExploradorClient from './ExploradorClient';
import { getIndicators, getTopicsWithCounts } from '@/lib/data';

export const metadata = {
  title: 'Explorador de Indicadores — Mexico en Datos',
  description: 'Catalogo completo de indicadores macroeconomicos de Mexico.',
};

export default async function ExploradorPage() {
  const [indicators, topics] = await Promise.all([
    getIndicators(),
    getTopicsWithCounts(),
  ]);

  return (
    <>
      <div className="pt-10 pb-6 px-[var(--pad-page)]">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Explorador de Indicadores
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-[600px]">
          Catalogo completo de indicadores macroeconomicos de Mexico. Busca por nombre o filtra por tema.
        </p>
      </div>
      <ExploradorClient indicators={indicators} topics={topics} />
      <div className="mt-12">
        <Footer />
      </div>
    </>
  );
}
