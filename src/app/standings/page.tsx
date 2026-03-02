'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LeagueEngine, TeamStanding } from '@/game/leagueEngine';
import { useRouter } from 'next/navigation';
import { TeamData, MatchData } from '@/types';

export default function LeagueStandingsPage() {
    const router = useRouter();
    const [standings, setStandings] = useState<TeamStanding[]>([]);
    const [teamsMap, setTeamsMap] = useState<Record<string, TeamData>>({});
    const [nextMatch, setNextMatch] = useState<MatchData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Manual Match State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedTeamA, setSelectedTeamA] = useState<string>('');
    const [selectedTeamB, setSelectedTeamB] = useState<string>('');

    useEffect(() => {
        const fetchStandings = async () => {
            // 1. Get the active playing session
            const { data: session } = await supabase
                .from('league_sessions')
                .select('*')
                .eq('status', 'MATCHES')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!session) {
                setIsLoading(false);
                return;
            }

            setSessionId(session.id);

            // 2. Fetch all teams in this session
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*')
                .eq('session_id', session.id);

            if (!teamsData) return;

            const tMap: Record<string, TeamData> = {};
            const initialStandings: TeamStanding[] = teamsData.map(t => {
                tMap[t.id] = t;
                return {
                    teamId: t.id,
                    matchesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    ties: 0,
                    points: 0,
                    runsScored: 0,
                    oversFaced: 0,
                    runsConceded: 0,
                    oversBowled: 0,
                    netRunRate: 0
                };
            });
            setTeamsMap(tMap);

            // 3. Fetch all matches to compute the table AND find the next scheduled math
            const { data: matchesData } = await supabase
                .from('matches')
                .select('*')
                .eq('session_id', session.id)
                .order('created_at', { ascending: true });

            if (matchesData) {
                const engine = new LeagueEngine(initialStandings);
                let foundNext = false;

                matchesData.forEach(m => {
                    if (m.status === 'FINISHED' && m.result) {
                        const { teamA_runs, teamA_overs, teamB_runs, teamB_overs, is_tie } = m.result;
                        engine.recordMatchResult(
                            m.team_a_id, teamA_runs || 0, teamA_overs || 20,
                            m.team_b_id, teamB_runs || 0, teamB_overs || 20,
                            is_tie || false
                        );
                    } else if (m.status === 'SCHEDULED' && !foundNext) {
                        setNextMatch(m);
                        foundNext = true;
                    }
                });

                setStandings(engine.getSortedStandings());
            }

            setIsLoading(false);
        };

        fetchStandings();
    }, []);

    const handleStartNextMatch = () => {
        if (nextMatch) {
            router.push(`/match/${nextMatch.id}`);
        }
    };

    const handleCreateManualMatch = async () => {
        if (!selectedTeamA || !selectedTeamB || selectedTeamA === selectedTeamB || !sessionId) return;

        setIsLoading(true);
        const matchInsert = {
            session_id: sessionId,
            team_a_id: selectedTeamA,
            team_b_id: selectedTeamB,
            status: 'SCHEDULED'
        };

        const { data, error } = await supabase.from('matches').insert([matchInsert]).select().single();
        if (data && !error) {
            router.push(`/match/${data.id}`);
        } else {
            console.error(error);
            setIsLoading(false);
            setIsManualModalOpen(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center text-primary font-bold">Calculating League Table...</div>;
    }

    if (Object.keys(teamsMap).length === 0) {
        return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center text-red-500 font-bold">No active matches session found. Complete an auction first.</div>;
    }

    return (
        <div className="bg-[#0a1410] font-display min-h-screen flex flex-col overflow-hidden text-slate-100">
            {/* Header Section */}
            <header className="w-full flex items-center justify-between px-8 py-4 border-b border-white/10 bg-surface-dark/95 backdrop-blur-md fixed top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">sports_cricket</span>
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold tracking-tight uppercase">Tabletop League</h1>
                        <p className="text-primary text-xs font-medium tracking-widest uppercase opacity-80">Season 2026</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase px-4 py-3 rounded-lg border border-white/10 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        Custom Match
                    </button>
                    {nextMatch && (
                        <div className="text-right flex items-center gap-4 border border-white/10 bg-black/40 px-4 py-2 rounded-xl">
                            <div className="flex flex-col items-end">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Up Next</p>
                                <p className="text-sm font-black text-white leading-none">
                                    {teamsMap[nextMatch.team_a_id]?.short_name} <span className="text-slate-500 text-xs mx-1">vs</span> {teamsMap[nextMatch.team_b_id]?.short_name}
                                </p>
                            </div>
                            <div className="w-px h-8 bg-white/10 mx-2"></div>
                            <button
                                onClick={handleStartNextMatch}
                                className="bg-primary hover:bg-emerald-400 text-background-dark text-xs font-black uppercase px-4 py-2 rounded flex items-center gap-1 transition-all"
                            >
                                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                Host Match
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-start p-8 pt-32 pb-20 w-full max-w-5xl mx-auto overflow-y-auto custom-scrollbar">
                <div className="w-full flex justify-between items-end mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-4xl font-black text-white tracking-tight uppercase">
                        League <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Standings</span>
                    </h2>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Playoff Zone (Top 4)</span>
                        </div>
                    </div>
                </div>

                {/* Standings Table Container */}
                <div className="w-full flex flex-col gap-3">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-2 text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1">
                        <div className="col-span-1 text-center">Rank</div>
                        <div className="col-span-5 text-left pl-4">Team</div>
                        <div className="col-span-1 text-center">M</div>
                        <div className="col-span-1 text-center">W</div>
                        <div className="col-span-1 text-center">L</div>
                        <div className="col-span-1 text-center">NRR</div>
                        <div className="col-span-2 text-right pr-4">Points</div>
                    </div>

                    {standings.map((s, idx) => {
                        const team = teamsMap[s.teamId];
                        const rank = idx + 1;
                        let tier = 'standard';
                        if (rank === 1) tier = 'gold';
                        else if (rank === 2) tier = 'silver';
                        else if (rank <= 4 && standings.length > 4) tier = 'bronze'; // Qualified
                        else if (rank === standings.length) tier = 'lowest';

                        // For 2 player games, we won't show heavy visual distinction for top 4 since there's only 2
                        if (standings.length <= 4) {
                            tier = rank === 1 ? 'gold' : 'standard';
                        }

                        return (
                            <LeaderboardRow
                                key={s.teamId}
                                rank={rank}
                                name={team?.name || 'Unknown'}
                                short={team?.short_name || 'UNK'}
                                matches={s.matchesPlayed}
                                won={s.wins}
                                lost={s.losses}
                                nrr={s.netRunRate > 0 ? `+${s.netRunRate}` : s.netRunRate.toString()}
                                points={s.points}
                                tier={tier}
                            />
                        );
                    })}
                </div>
            </main>

            {/* Manual Match Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-[#1c3326] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => setIsManualModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">handshake</span>
                            Schedule Match
                        </h2>

                        <div className="flex flex-col gap-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Team 1 (Batting First)</label>
                                <select
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary"
                                    value={selectedTeamA}
                                    onChange={e => setSelectedTeamA(e.target.value)}
                                >
                                    <option value="" disabled>Select Team...</option>
                                    {Object.values(teamsMap).map((t: TeamData) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-surface-dark border border-white/10 size-8 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-xs font-black text-slate-500 italic">VS</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Team 2 (Bowling First)</label>
                                <select
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary"
                                    value={selectedTeamB}
                                    onChange={e => setSelectedTeamB(e.target.value)}
                                >
                                    <option value="" disabled>Select Team...</option>
                                    {Object.values(teamsMap).map((t: TeamData) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            disabled={!selectedTeamA || !selectedTeamB || selectedTeamA === selectedTeamB}
                            onClick={handleCreateManualMatch}
                            className="w-full bg-primary hover:bg-emerald-400 text-background-dark font-black tracking-widest uppercase py-4 rounded-xl shadow-[0_0_20px_rgba(43,238,121,0.3)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                        >
                            Start Match Now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function LeaderboardRow({ rank, name, short, matches, won, lost, nrr, points, tier }: { rank: number, name: string, short: string, matches: number, won: number, lost: number, nrr: string, points: number, tier: string }) {
    if (tier === 'gold') {
        return (
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-900/40 via-surface-dark to-surface-dark border-l-4 border-yellow-500 shadow-lg shadow-black/20 transform transition-all">
                <div className="grid grid-cols-12 gap-4 items-center px-6 py-5">
                    <div className="col-span-1 flex justify-center">
                        <span className="flex items-center justify-center size-8 rounded-full bg-yellow-500 text-black font-black text-lg shadow-[0_0_15px_rgba(234,179,8,0.4)]">{rank}</span>
                    </div>
                    <div className="col-span-5 flex items-center gap-4 pl-4">
                        <div className="size-12 rounded-full bg-black p-0.5 border border-white/10 flex items-center justify-center">
                            <span className="text-slate-300 font-bold text-xs">{short}</span>
                        </div>
                        <div>
                            <h3 className="text-white text-xl font-black tracking-tight leading-none mb-1 truncate max-w-[200px]">{name}</h3>
                            <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-widest drop-shadow-md">Table Leader</span>
                        </div>
                    </div>
                    <div className="col-span-1 text-center text-lg font-bold text-white">{matches}</div>
                    <div className="col-span-1 text-center text-xl font-black text-primary drop-shadow-[0_0_10px_rgba(43,238,121,0.3)]">{won}</div>
                    <div className="col-span-1 text-center text-lg font-medium text-slate-500">{lost}</div>
                    <div className="col-span-1 text-center text-base font-bold text-slate-300">{nrr}</div>
                    <div className="col-span-2 text-right pr-4">
                        <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{points}</span>
                    </div>
                </div>
            </div>
        );
    }

    const isQualified = tier === 'silver' || tier === 'bronze';
    const rowClasses = tier === 'lowest' ? 'bg-black/20 opacity-70 border-white/5' : 'bg-surface-dark border-white/5';
    const borderClasses = isQualified ? 'border-l-4 border-l-blue-500/50' : '';

    return (
        <div className={`group relative overflow-hidden rounded-xl ${rowClasses} border ${borderClasses} shadow-md transition-all`}>
            <div className={`grid grid-cols-12 gap-4 items-center px-6 py-4`}>
                <div className="col-span-1 flex justify-center">
                    <span className="text-slate-500 font-bold text-lg">{rank}</span>
                </div>
                <div className="col-span-5 flex items-center gap-4 pl-4">
                    <div className="size-10 rounded-full bg-black p-0.5 border border-white/5 flex items-center justify-center shrink-0">
                        <span className="text-slate-400 font-bold text-[10px]">{short}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h3 className={`text-slate-200 text-lg font-bold tracking-tight truncate`}>{name}</h3>
                        {isQualified && <span className="text-blue-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">Qualified</span>}
                    </div>
                </div>
                <div className="col-span-1 text-center text-base font-bold text-slate-300">{matches}</div>
                <div className="col-span-1 text-center text-lg font-bold text-primary/80">{won}</div>
                <div className="col-span-1 text-center text-base font-medium text-slate-500">{lost}</div>
                <div className="col-span-1 text-center text-sm font-bold text-slate-400">{nrr}</div>
                <div className="col-span-2 text-right pr-4">
                    <span className={`text-3xl font-black tracking-tighter text-white`}>{points}</span>
                </div>
            </div>
        </div>
    );
}

