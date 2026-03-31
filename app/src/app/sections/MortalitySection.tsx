import Card from '@/components/ui/Card';

export default function MortalitySection() {
  return (
    <div className="px-[var(--pad-page)] mb-12">
      <Card>
        <div className="py-4">
          <div className="text-base font-semibold text-white tracking-tight mb-2">
            Salud
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Proximamente: indicadores de salud publica, mortalidad y morbilidad.
          </p>
        </div>
      </Card>
    </div>
  );
}
