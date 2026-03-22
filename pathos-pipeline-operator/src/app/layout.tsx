import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PathOS Operator Console',
  description: 'Thin operator GUI for PathOS pipeline supervision',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090b0e] text-slate-200 min-h-screen">
        {children}
      </body>
    </html>
  );
}
