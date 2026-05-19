import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { PwaBootstrap } from '~/components/pwa/PwaBootstrap';

export const metadata: Metadata = {
  title: 'Real Estate Solutions',
  description: 'Builder operations platform',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <PwaBootstrap />
        </Providers>
      </body>
    </html>
  );
}
