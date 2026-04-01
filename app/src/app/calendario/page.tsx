
export const metadata = {
  title: 'Calendario de Publicaciones — Mexico en Datos',
  description: 'Proximas publicaciones de datos del INEGI.',
};

export default function CalendarioPage() {
  return (
    <>
      <div className="pt-10 pb-6 px-[var(--pad-page)]">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Calendario de Publicaciones
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-[600px]">
          Proximamente: calendario con las fechas de publicacion de datos del INEGI, Banxico y otras fuentes oficiales.
        </p>
      </div>
      <div className="px-[var(--pad-page)]">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Esta seccion esta en desarrollo.
          </p>
        </div>
      </div>
    </>
  );
}
