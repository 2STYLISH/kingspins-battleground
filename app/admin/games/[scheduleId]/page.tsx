import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ScreenshotUploadPanel from '@/components/admin/ScreenshotUploadPanel';
import VerifyStatsForm from '@/components/admin/VerifyStatsForm';
import BackButton from '@/components/BackButton';
import ManualStatsButton from '@/components/admin/ManualStatsButton';
import { formatDate, formatTime } from '@/lib/format';

export const maxDuration = 60;

export default async function AdminGameDetailPage({ params }: { params: { scheduleId: string } }) {
  const supabase = createClient();

  const { data: schedule } = await supabase
    .from('schedules')
    .select(
      'id, scheduled_date, scheduled_time, game_type, round_label, status, home_team_id, away_team_id, tournament_id, series_id, home:teams!schedules_home_team_id_fkey(id,name), away:teams!schedules_away_team_id_fkey(id,name)'
    )
    .eq('id', params.scheduleId)
    .maybeSingle();

  if (!schedule) notFound();

  const { data: game } = await supabase
    .from('games')
    .select('id, status, home_score, away_score, verified_at')
    .eq('schedule_id', params.scheduleId)
    .maybeSingle();

  let seriesSchedules: any[] = [];
  if (schedule.series_id) {
    const { data } = await supabase
      .from('schedules')
      .select('id, status')
      .eq('series_id', schedule.series_id)
      .order('created_at', { ascending: true });
    if (data) seriesSchedules = data;
  }

  const { data: screenshots } = game
    ? await supabase
        .from('game_screenshots')
        .select('id, storage_path, ai_extraction, ai_confidence, uploaded_at')
        .eq('game_id', game.id)
        .order('uploaded_at', { ascending: false })
    : { data: [] };

  const { data: existingStats } = game
    ? await supabase.from('player_game_stats').select('*').eq('game_id', game.id)
    : { data: [] };

  const [{ data: homeRoster }, { data: awayRoster }] = await Promise.all([
    supabase.from('tournament_rosters').select('player:players(id, gamertag)').eq('tournament_id', schedule.tournament_id).eq('team_id', schedule.home_team_id),
    supabase.from('tournament_rosters').select('player:players(id, gamertag)').eq('tournament_id', schedule.tournament_id).eq('team_id', schedule.away_team_id),
  ]);

  const homePlayers = homeRoster?.map((r: any) => r.player).filter(Boolean) ?? [];
  const awayPlayers = awayRoster?.map((r: any) => r.player).filter(Boolean) ?? [];

  const latestScreenshot = (screenshots ?? [])[0] ?? null;
  const homeTeamName = (schedule.home as any)?.name ?? 'Home';
  const awayTeamName = (schedule.away as any)?.name ?? 'Away';
  const isVerified = game?.status === 'VERIFIED' || game?.status === 'COMPLETED';

  return (
    <div className="space-y-8">
      <BackButton />

      {/* Game header */}
      <div>
        <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest mb-2">
          {schedule.game_type}
          {schedule.round_label ? ` · ${schedule.round_label}` : ''} · {formatDate(schedule.scheduled_date)} {formatTime(schedule.scheduled_time)}
        </p>
        <h1 className="text-3xl text-white mt-2">
          {homeTeamName} <span className="text-silver-600">vs</span> {awayTeamName}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
            isVerified ? 'text-silver-200 bg-surface-700' : 'text-silver-500 bg-surface-800'
          }`}>
            {game?.status ?? 'SCHEDULED'}
          </span>
        </div>
      </div>

      {/* Series Game Selector Tabs */}
      {seriesSchedules.length > 1 && (
        <div className="flex gap-2 bg-surface-900 p-2 rounded-lg border border-surface-700 overflow-x-auto">
          {seriesSchedules.map((s, idx) => {
            const isActive = s.id === params.scheduleId;
            const isCancelled = s.status === 'CANCELLED';
            const gameNumber = idx + 1;
            
            return (
              <a
                key={s.id}
                href={`/admin/games/${s.id}`}
                className={`px-4 py-2 text-xs font-mono font-bold tracking-widest uppercase rounded flex-1 text-center whitespace-nowrap transition-colors ${
                  isActive 
                    ? 'bg-surface-700 text-bone' 
                    : isCancelled
                    ? 'text-surface-600 hover:bg-surface-800/50 cursor-not-allowed opacity-50'
                    : 'text-silver-500 hover:bg-surface-800 hover:text-silver-300'
                }`}
                onClick={isCancelled ? (e) => e.preventDefault() : undefined}
              >
                Game {gameNumber}
                {isCancelled && ' (Cancelled)'}
              </a>
            );
          })}
        </div>
      )}

      {/* Screenshot + AI panel or Manual Entry */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <ScreenshotUploadPanel
            scheduleId={schedule.id}
            latestExtraction={latestScreenshot?.ai_extraction ?? null}
            screenshotId={latestScreenshot?.id ?? null}
          />
        </div>
        {!game && (
          <div>
            <ManualStatsButton scheduleId={schedule.id} />
          </div>
        )}
      </div>

      {/* Stats form — shown when game exists */}
      {game && (
        <VerifyStatsForm
          gameId={game.id}
          homeTeamId={schedule.home_team_id}
          awayTeamId={schedule.away_team_id}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homePlayers={homePlayers ?? []}
          awayPlayers={awayPlayers ?? []}
          extraction={latestScreenshot?.ai_extraction ?? null}
          existingStats={existingStats ?? []}
        />
      )}

      {/* Verified banner */}
      {isVerified && (
        <div className="card p-6 border-surface-600">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-silver-500 uppercase tracking-widest">✓ Verified</span>
          </div>
          <p className="text-white text-xl font-display">
            {homeTeamName} {game.home_score} — {game.away_score} {awayTeamName}
          </p>
          <p className="text-silver-500 text-xs mt-2">
            This game's stats are now live on the public page and award rankings have been updated.
          </p>
        </div>
      )}
    </div>
  );
}
