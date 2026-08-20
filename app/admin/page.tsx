import Link from '@/components/HiddenLink';

const SECTIONS = [
  {
    href: '/admin/players',
    title: 'PLAYERS',
    desc: 'Manage the global player registry. Create, update, or delete all registered players.',
    icon: '👤',
  },
  {
    href: '/admin/teams',
    title: 'TEAMS & ROSTERS',
    desc: 'Create teams and add players — everything else depends on this existing first.',
    icon: '👥',
  },
  {
    href: '/admin/games',
    title: 'GAMES & SCREENSHOTS',
    desc: 'Upload box-score screenshots, run AI extraction, review and verify stats.',
    icon: '🎮',
  },
  {
    href: '/admin/schedule',
    title: 'SCHEDULE',
    desc: 'Create and manage games — regular season, playoffs, tournament, exhibition.',
    icon: '📅',
  },
  {
    href: '/admin/stats',
    title: 'PLAYER STATS',
    desc: 'View per-player season averages for all teams. Includes unverified game data.',
    icon: '📊',
  },
  {
    href: '/admin/awards',
    title: 'AWARDS',
    desc: 'Candidate rankings auto-update after every verified game. Admin picks the winner.',
    icon: '🥇',
  },
  {
    href: '/admin/bracket',
    title: 'BRACKET',
    desc: 'Seed teams, generate brackets, verify series results, manual overrides.',
    icon: '🏆',
  },
  {
    href: '/admin/tournaments',
    title: 'MANAGE TOURNAMENTS',
    desc: 'Manage tournament settings, change status, or create new tournaments.',
    icon: '⚙️',
  },
];

export default function AdminHomePage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-surface-700">
        <h1 className="text-4xl text-white mb-2">CONTROL ROOM</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="relative group p-6 rounded-2xl border border-surface-700/50 bg-gradient-to-br from-surface-900/80 to-surface-950/80 backdrop-blur-xl shadow-lg hover:shadow-[0_0_25px_rgba(220,38,38,0.15)] hover:border-red-500/40 transition-all duration-300 overflow-hidden flex items-start gap-5"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-colors"></div>

            <div className="relative z-10 w-12 h-12 shrink-0 rounded-xl bg-surface-900 border border-surface-700/50 shadow-inner flex items-center justify-center text-2xl group-hover:scale-110 group-hover:border-red-500/30 transition-all duration-300">
              <span className="opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-md">
                {s.icon}
              </span>
            </div>
            
            <div className="relative z-10 flex-1 pt-1">
              <p className="text-sm text-white font-display tracking-widest mb-1.5 group-hover:text-red-400 transition-colors drop-shadow-sm">
                {s.title}
              </p>
              <p className="text-xs text-silver-500 leading-relaxed font-mono tracking-wide">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
