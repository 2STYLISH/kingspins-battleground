'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/playerstats', label: 'Stats' },
  { href: '/awards', label: 'Awards' },
  { href: '/tournaments', label: 'Tournaments' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-surface-700 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full border border-surface-600 bg-surface-800 flex items-center justify-center group-hover:border-silver-400 transition-colors">
            <span className="font-display text-xs text-silver-200">KP</span>
          </div>
          <span className="font-display text-lg tracking-[0.2em] text-white">
            KINGPINS <span className="text-silver-400">BATTLEGROUND</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-body transition-colors ${
                  active
                    ? 'bg-surface-700 text-white'
                    : 'text-silver-400 hover:text-white hover:bg-surface-800'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
