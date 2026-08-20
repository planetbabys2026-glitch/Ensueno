import type { Metadata, Viewport } from 'next';
import { DynaPuff, Nunito } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { UserProvider } from '@/context/UserContext';
import AppLayoutWrapper from '@/components/layout/AppLayoutWrapper';
import { ToastProvider } from '@/context/ToastContext';
import MetaPixel from '@/components/analytics/MetaPixel';

// Marca. Variable 400–700 en un solo archivo; el subset `latin` (U+0000-00FF)
// cubre ñ á é í ó ú ü ¡ ¿. Se expone como variable CSS, no como className, para
// que DynaPuff no caiga sobre todo el cuerpo de texto.
const dynapuff = DynaPuff({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  fallback: ['Nunito', 'Segoe UI', 'sans-serif'],
});

// Cuerpo y UI. Variable 200–1000 en un archivo.
const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Ensueño | Cuidado natural que sí cuida la piel de tu bebé',
  description:
    'E-Commerce de cosmética hipoalergénica infantil con fórmulas de lavanda, manzanilla y avena para el descanso perfecto de tu bebé.',
};

/**
 * `colorScheme: 'light'` acompaña al `color-scheme` de globals.css: le dice al
 * navegador que el sitio solo tiene versión clara, así que con el sistema en
 * modo oscuro no repinta los controles nativos ni la barra del navegador.
 */
export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#bde4f8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className={`${dynapuff.variable} ${nunito.variable} min-h-screen flex flex-col bg-surface text-on-surface antialiased relative`}>
        <ToastProvider>
          <CartProvider>
            <UserProvider>
              <MetaPixel />
              <AppLayoutWrapper>{children}</AppLayoutWrapper>
            </UserProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
