import type React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';
import './globals.css';

/**
 * Font configuration for the application.
 * - geistSans: Primary sans-serif font used throughout the app
 * - geistMono: Monospace font for code blocks and technical content
 *
 * These are assigned to CSS variables --font-sans and --font-mono
 * which are referenced in Tailwind configuration.
 */
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'PathOS - Decision Intelligence Platform',
  description: 'Unified career planning for federal and military personnel',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout(props: Readonly<{ children: React.ReactNode }>) {
  const children = props.children;

  /**
   * Apply font CSS variables to the HTML element so they're available throughout the app.
   * The "dark" class enables dark mode by default.
   * suppressHydrationWarning prevents React hydration warnings from theme script.
   */
  return (
    <html lang="en" className={geistSans.variable + ' ' + geistMono.variable + ' dark'} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
