import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import NavBar from "@/components/ui/NavBar";
import Footer from "@/components/ui/Footer";
import { ChatProvider } from "@/components/ui/ChatProvider";
import ChatPanel from "@/components/ui/ChatPanel";

const SITE_URL = 'https://datamx.sebastian.mx';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'M\u00e9xico en Datos \u2014 Estad\u00edsticas p\u00fablicas de M\u00e9xico',
    template: '%s | M\u00e9xico en Datos',
  },
  description:
    'Explora datos oficiales de INEGI, Banxico, ENOE, ENVIPE y m\u00e1s. Indicadores econ\u00f3micos, empleo, seguridad y salud de M\u00e9xico con gr\u00e1ficas interactivas y un asistente de IA.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'M\u00e9xico en Datos',
    description: 'Datos oficiales de M\u00e9xico: econom\u00eda, empleo, seguridad y salud. Gr\u00e1ficas interactivas y asistente de IA.',
    url: SITE_URL,
    siteName: 'M\u00e9xico en Datos',
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'M\u00e9xico en Datos',
    description: 'Datos oficiales de M\u00e9xico con gr\u00e1ficas interactivas y asistente de IA.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: [
    'M\u00e9xico datos', 'INEGI', 'Banxico', 'inflaci\u00f3n M\u00e9xico', 'PIB M\u00e9xico',
    'desempleo M\u00e9xico', 'tipo de cambio', 'cifra negra', 'informalidad laboral',
    'estad\u00edsticas M\u00e9xico', 'datos abiertos M\u00e9xico', 'ENOE', 'ENVIPE',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'M\u00e9xico en Datos',
              url: 'https://datamx.sebastian.mx',
              description: 'Datos oficiales de M\u00e9xico: econom\u00eda, empleo, seguridad y salud con gr\u00e1ficas interactivas y asistente de IA.',
              inLanguage: 'es',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://datamx.sebastian.mx/explorador?search={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body>
        <ChatProvider>
          <NavBar />
          <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', width: '100%', paddingTop: '56px', paddingBottom: '120px' }}>
            {children}
            <Footer />
          </div>
          <ChatPanel />
        </ChatProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
