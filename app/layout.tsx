import type { Metadata } from 'next';
import './globals.css';
import { RootProviders } from '@/components/root-providers';

export const metadata: Metadata = {
  title: 'Replit - Build apps and sites with AI',
  description:
    'turn ideas into apps in minutes. Replit agent writes production-ready code, evolves it, and stays out of your way.',
  openGraph: {
    title: 'Replit - Build apps and sites with AI',
    description: 'Turn ideas into apps in minutes - no coding needed.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
