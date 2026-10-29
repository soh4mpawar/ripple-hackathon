import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ripple — Outdated Event Materials Detector',
  description: 'Find outdated information across your event announcements, posters, and volunteer instructions when an official detail changes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-warm-50 text-stone-900 antialiased selection:bg-brand-100 selection:text-brand-900">
        {children}
      </body>
    </html>
  );
}
