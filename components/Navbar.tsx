'use client';

import Link from '@/components/HiddenLink';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { checkAdminStatus } from '@/lib/actions/auth';

const LINKS = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/playerstats', label: 'Stats' },
  { href: '/awards', label: 'Awards' },
  { href: '/tournaments', label: 'Tournaments' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Player search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ gamertag: string; slug: string | null }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Profile & Mobile menu state
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Check auth and subscribe to changes (login/logout)
  useEffect(() => {
    async function verifyAuth() {
      try {
        const { username, isAdmin } = await checkAdminStatus();
        setUsername(username);
        setIsAdmin(isAdmin);
      } catch (err) {
        console.error('Navbar auth check failed:', err);
        setIsAdmin(false);
        setUsername(null);
      }
    }

    // Initial check
    verifyAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        verifyAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Live player search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('players')
        .select('gamertag, slug')
        .ilike('gamertag', `%${query}%`)
        .limit(8);
      setResults(data ?? []);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearchSelect(player: { gamertag: string; slug: string | null }) {
    const href = `/${player.slug || player.gamertag.toLowerCase()}`;
    setQuery('');
    setResults([]);
    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(href);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUsername(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="border-b border-surface-700 bg-[#080808]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-surface-600 bg-surface-800 flex items-center justify-center group-hover:border-red-600 transition-colors">
            <Image src="/bg-kingpins.png" alt="Kingpins Logo" fill className="object-cover" />
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-6">
          {/* Player Search */}
          <div ref={searchRef} className="relative max-w-xs w-full lg:max-w-sm">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search player…"
              className="w-full bg-[#111] border border-surface-700 rounded-lg px-3 py-1.5 text-sm text-silver-200 placeholder-silver-600 focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-colors"
            />
            {searchOpen && results.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-[#111] border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {results.map((p) => (
                  <button
                    key={p.gamertag}
                    onMouseDown={() => handleSearchSelect(p)}
                    className="w-full text-left px-4 py-2.5 text-sm text-silver-200 hover:bg-surface-800 hover:text-red-600 transition-colors flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono text-silver-600">▶</span>
                    {p.gamertag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-2">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-body uppercase tracking-wider transition-colors ${active ? 'text-[#b8860b] font-bold' : 'text-silver-400 hover:text-red-600'
                    }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 rounded-full border border-surface-600 bg-surface-800 hover:border-red-600 transition-colors flex items-center justify-center"
              title={username ?? 'Account'}
            >
              {username ? (
                <span className="text-xs font-mono text-silver-200 uppercase">
                  {username.charAt(0)}
                </span>
              ) : (
                <svg className="w-4 h-4 text-silver-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {username ? (
                  <>
                    <div className="px-4 py-3 border-b border-surface-700">
                      <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest">Signed in as</p>
                      <p className="text-sm text-silver-200 truncate mt-0.5">{username}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="block w-full text-left px-4 py-2.5 text-sm text-silver-400 hover:bg-surface-800 transition-colors"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-silver-400 hover:text-red-600 hover:bg-surface-800 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setProfileOpen(false)}
                    className="block w-full text-left px-4 py-3 text-sm text-silver-300 hover:text-white hover:bg-surface-800 transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>

          <button
            className="md:hidden text-silver-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-700 bg-[#080808]">
          <div className="p-4 space-y-4">
            {/* Mobile Search */}
            <div className="relative w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search player…"
                className="w-full bg-[#111] border border-surface-700 rounded-lg px-3 py-2 text-sm text-silver-200 placeholder-silver-600 focus:outline-none focus:border-red-600"
              />
              {query && results.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-[#111] border border-surface-700 rounded-xl overflow-hidden z-50">
                  {results.map((p) => (
                    <button
                      key={p.gamertag}
                      onClick={() => handleSearchSelect(p)}
                      className="w-full text-left px-4 py-2.5 text-sm text-silver-200 hover:bg-surface-800 hover:text-red-600 transition-colors"
                    >
                      {p.gamertag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <nav className="flex flex-col space-y-2">
              {LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + '/');
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-md text-sm font-body uppercase tracking-wider transition-colors ${active ? 'bg-surface-800 text-[#b8860b] font-bold' : 'text-silver-400 hover:text-red-600'
                      }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
