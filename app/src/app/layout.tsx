import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import NavBar from "@/components/ui/NavBar";
import Footer from "@/components/ui/Footer";
import { ChatProvider } from "@/components/ui/ChatProvider";
import ChatPanel from "@/components/ui/ChatPanel";

export const metadata: Metadata = {
  title: "México en Datos — Estadísticas públicas de México",
  description:
    "Explora datos de INEGI, Secretaría de Salud, IMSS, CONAPO y más. Indicadores económicos, empleo, salud, seguridad y demografía de México en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
      </body>
    </html>
  );
}
