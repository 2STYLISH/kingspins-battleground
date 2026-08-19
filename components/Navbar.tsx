'use client';

import Link from 'next/link';
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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Player search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ gamertag: string; slug: string | null }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Check auth and subscribe to changes (login/logout)
  useEffect(() => {
    async function verifyAuth() {
      try {
        const { userEmail, isAdmin } = await checkAdminStatus();
        setUserEmail(userEmail);
        setIsAdmin(isAdmin);
      } catch (err) {
        console.error('Navbar auth check failed:', err);
        setIsAdmin(false);
        setUserEmail(null);
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
    router.push(href);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUserEmail(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="border-b border-surface-700 bg-surface-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-8 h-8 rounded-full border border-surface-600 bg-surface-800 flex items-center justify-center group-hover:border-silver-400 transition-colors">
            <span className="font-display text-xs text-silver-200">KP</span>
          </div>
          <span className="font-display text-lg tracking-[0.2em] text-white hidden sm:block">
            KINGPINS <span className="text-silver-400">BATTLEGROUND</span>
          </span>
        </Link>

        {/* Player Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search player…"
            className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-1.5 text-sm text-silver-200 placeholder-silver-700 focus:outline-none focus:ring-1 focus:ring-silver-500 focus:border-silver-500 transition-colors"
          />
          {searchOpen && results.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50">
              {results.map((p) => (
                <button
                  key={p.gamertag}
                  onMouseDown={() => handleSearchSelect(p)}
                  className="w-full text-left px-4 py-2.5 text-sm text-silver-200 hover:bg-surface-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="text-[10px] font-mono text-silver-600">▶</span>
                  {p.gamertag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-body transition-colors ${active ? 'bg-surface-700 text-white' : 'text-silver-400 hover:text-white hover:bg-surface-800'
                  }`}
              >
                {l.label}
              </Link>
            );
          })}

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative ml-1">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 rounded-full border border-surface-600 bg-surface-800 hover:border-silver-400 transition-colors flex items-center justify-center"
              title={userEmail ?? 'Account'}
            >
              {userEmail ? (
                <span className="text-xs font-mono text-silver-200 uppercase">
                  {userEmail.charAt(0)}
                </span>
              ) : (
                <svg className="w-4 h-4 text-silver-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {userEmail ? (
                  <>
                    <div className="px-4 py-3 border-b border-surface-700">
                      <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest">Signed in as</p>
                      <p className="text-sm text-silver-200 truncate mt-0.5">{userEmail}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="block w-full text-left px-4 py-2.5 text-sm text-gold hover:bg-surface-700 transition-colors"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-silver-400 hover:text-white hover:bg-surface-700 transition-colors"
                    >
                      ↩ Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setProfileOpen(false)}
                    className="block w-full text-left px-4 py-3 text-sm text-silver-300 hover:text-white hover:bg-surface-700 transition-colors"
                  >
                    🔑 Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
