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
        <p className="text-xs font-mono text-silver-600 uppercase tracking-[0.3em] mb-2">Control Room</p>
        <h1 className="text-4xl text-white mb-2">ADMIN</h1>
        <p className="text-silver-500 text-sm">
          Public pages only ever show what you verify or publish here. Award candidates
          auto-update every time you verify a game.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card-hover p-5 flex items-start gap-4 group"
          >
            <span className="text-2xl mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
              {s.icon}
            </span>
            <div>
              <p className="text-sm text-white font-display tracking-widest mb-1 group-hover:text-silver-100 transition-colors">
                {s.title}
              </p>
              <p className="text-sm text-silver-500 leading-relaxed">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
