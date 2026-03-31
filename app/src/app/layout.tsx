import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M\u00e9xico en Datos \u2014 Estad\u00edsticas p\u00fablicas de M\u00e9xico",
  description:
    "Explora datos de INEGI, Secretar\u00eda de Salud, IMSS, CONAPO y m\u00e1s. Indicadores econ\u00f3micos, empleo, salud, seguridad y demograf\u00eda de M\u00e9xico en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', width: '100%', paddingBottom: '120px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
