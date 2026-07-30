import type { Metadata, Viewport } from 'next';
import { Orbitron, Rajdhani } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/providers/SessionProvider';
import { ToastProvider } from '@/providers/ToastProvider';

/**
 * Fonts are downloaded and self-hosted at build time by next/font, so the
 * kiosk has no runtime dependency on an external CDN — it has to work on a gym
 * network with flaky wifi.
 */
const display = Orbitron({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  variable: '--font-display',
  display: 'swap',
});

const body = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Elever Performance Lab',
    template: '%s · Elever Performance Lab',
  },
  description:
    'Futuristic training terminal — scan in, log your sets, and track your progress at Elever Performance Lab.',
  applicationName: 'Elever Performance Lab',
};

export const viewport: Viewport = {
  themeColor: '#03050b',
  width: 'device-width',
  initialScale: 1,
  // The kiosk is a fixed panel: pinch-zoom would only ever be an accident.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body data-kiosk="true">
        <ToastProvider>
          <SessionProvider>{children}</SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
