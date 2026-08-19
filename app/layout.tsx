import type { Metadata } from 'next';
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import UrlHider from '@/components/UrlHider';
import BackgroundManager from '@/components/BackgroundManager';
import './globals.css';

const display = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'KINGPINS BATTLEGROUND',
  description: 'NBA 2K Pro-Am league — stats, brackets, schedules, awards.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-black min-h-screen">
        <BackgroundManager />
        <UrlHider />
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 relative z-0">{children}</main>
      </body>
    </html>
  );
}
