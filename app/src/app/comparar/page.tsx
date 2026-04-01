import CompararClient from './CompararClient';
import { getIndicators } from '@/lib/data';

export const metadata = {
  title: 'Comparar Indicadores — Mexico en Datos',
  description: 'Compara hasta 3 indicadores macroeconomicos en una misma grafica.',
};

export default async function CompararPage() {
  const indicators = await getIndicators();

  return (
    <>
      <div className="pt-10 pb-6 px-[var(--pad-page)]">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Comparar Indicadores
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-[600px]">
          Selecciona hasta 3 indicadores para comparar en una misma grafica.
        </p>
      </div>
      <div className="px-[var(--pad-page)]">
        <CompararClient indicators={indicators} />
      </div>
    </>
  );
}
