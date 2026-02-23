'use client';

import React, { useEffect, useStaimport { create } from 'zustand';
import usePartySocket from 'partysocket/react';
import { supabase } from '@/lib/supabase';
import { useAuctionStore } from '@/store/auctionStore';
import { useRouter } from 'next/navigation';

export default function TeamDashboardPage({ params }: { params: Promise<{ teamId: string }> }) {
    const { teamId } = use(params);
    const router = useRouter();
    const { state, updateState } = useAuctionStore();
    const [team, setTeam] = useState<any>(null);
    const [roster, setRoster] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activePlayer, setActivePlayer] = useState<any>(null);
    const [liveMatchId, setLiveMatchId] = useState<string | null>(null);

    const fetchTeamData = React.useCallback(async () => {
        // Fetch specific team
        const { data: teamData } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();

        if (teamData) {
            setTeam(teamData);

            // Fetch session data
            const { data: sessionData } = await supabase.from('league_sessions').select('status').eq('id', teamData.session_id).single();
            if (sessionData) setSessionStatus(sessionData.status);

            // Fetch live match if applicable
            const { data: mlive } = await supabase.from('matches').select('id').eq('session_id', teamData.session_id).eq('status', 'IN_PROGRESS').limit(1).maybeSingle();
            if (mlive) setLiveMatchId(mlive.id);
            else setLiveMatchId(null);

            // Fetch the roster with joined player details
            const { data: rosterData } = await supabase
                .from('team_rosters')
                .select(`
                    bought_for,
                    players (*)
                `)
                .eq('team_id', teamId);

            if (rosterData) {
                setRoster(rosterData);
            }

            // Fetch All Teams in session to determine the global sold pool
            const { data: teamsInSession } = await supabase.from('teams').select('id').eq('session_id', teamData.session_id);
            const teamIds = teamsInSession?.map(t => t.id) || [];

            const { data: rostersData } = await supabase.from('team_rosters').select('player_id').in('team_id', teamIds);
            const soldPlayerIds = new Set(rostersData?.map(r => r.player_id) || []);

            const { data: allPlayers } = await supabase.from('players').select('*');
            if (allPlayers) {
                setUnsoldPlayers(allPlayers.filter(p => !soldPlayerIds.has(p.id)));
            }
        }
        setIsLoading(false);
    }, [teamId]);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    useEffect(() => {
        if (!team) return;
        const channel = supabase.channel('matches_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => {
                fetchTeamData();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'league_sessions' }, (payload) => {
                if (payload.new.id === team.session_id) setSessionStatus(payload.new.status);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [team?.session_id]);

    const activePlayer = (state.currentPlayerId && state.status !== 'WAITING')
        ? unsoldPlayers.find(p => p.id === state.currentPlayerId)
        : null;

    // Only connect if we know the sessionId
    // PartySocket handles reconnection if room changes
    usePartySocket({
        host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
        room: team?.session_id || "default",
        onMessage: (e) => {
            const message = JSON.parse(e.data);
            if (message.type === 'SYNC') {
                updateState(message.state);
            }
            if (message.type === 'ALLOCATE_PLAYER') {
                fetchTeamData();
            }
        }
    });

    if (isLoading) {
        return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center text-primary font-bold">Loading Team Data...</div>;
    }

    if (!team) {
        return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center text-red-500 font-bold">Team not found</div>;
    }

    // Calculations
    const totalSpent = 150 - team.purse;
    const batsmenCount = roster.filter(r => r.players.role === 'BAT').length;
    const bowlerCount = roster.filter(r => r.players.role === 'BOWL').length;
    const wkCount = roster.filter(r => r.players.role === 'WK').length;
    const weakCount = roster.filter(r => r.players.category === 'WEAK').length;

    return (
        <div className="bg-[#0a1410] text-slate-100 font-display min-h-screen flex flex-col overflow-hidden">
            {/* Header Section */}
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-surface-dark/95 backdrop-blur-md z-10 w-full">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-black flex items-center justify-center p-0.5 border border-primary/30 text-xs font-bold text-center">
                            {team.short_name}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">{team.name}</h1>
                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Live Sync
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header Stats */}
                <div className="flex items-center gap-4">
                    {sessionStatus === 'MATCHES' && liveMatchId && (
                        <button onClick={() => router.push(`/spectator/${liveMatchId}`)} className="bg-red-500 hover:bg-red-400 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                            <span className="material-symbols-outlined">live_tv</span> Watch Live
                        </button>
                    )}
                    {sessionStatus === 'MATCHES' && !liveMatchId && (
                        <button onClick={() => router.push(`/standings`)} className="bg-primary hover:bg-green-400 text-background-dark font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">table_chart</span> Standings
                        </button>
                    )}
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Total Spent</span>
                        <span className="text-white text-lg font-bold">₹ {totalSpent.toFixed(2)} Cr</span>
                    </div>
                    <div className="hidden md:block h-8 w-px bg-white/10"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-primary text-[10px] uppercase tracking-wider font-bold">Purse Remaining</span>
                        <span className="text-primary text-2xl font-black">₹ {team.purse.toFixed(2)} Cr</span>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                {/* Sidebar / Stats Panel */}
                <aside className="w-full md:w-80 border-r border-white/10 bg-surface-dark flex flex-col p-6 gap-6 overflow-y-auto z-0 custom-scrollbar shrink-0">
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">analytics</span>
                            Live Quota Targets
                        </h3>

                        {/* Stat Item - Basic Role Limits */}
                        <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                            <QuotaProgress label="Batsmen" current={batsmenCount} min={5} color="bg-blue-400" />
                            <QuotaProgress label="Bowlers" current={bowlerCount} min={4} color="bg-red-400" />
                            <QuotaProgress label="Wicket Keeper" current={wkCount} min={1} color="bg-amber-400" />
                        </div>

                        {/* Stat Item - Weak Quota */}
                        <div className={`p-4 rounded-xl border ${weakCount >= 3 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={`${weakCount >= 3 ? 'text-green-400' : 'text-red-400'} text-sm font-bold`}>Weak Category Quota</span>
                                <span className="text-white font-bold">{weakCount}<span className="text-slate-500 font-normal">/3 Required</span></span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-2">
                                <div className={`${weakCount >= 3 ? 'bg-green-500' : 'bg-red-500'} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, (weakCount / 3) * 100)}%` }}></div>
                            </div>
                            {weakCount < 3 && <p className="text-xs text-red-400/70 mt-3 font-semibold">*Must draft at least {3 - weakCount} more weak players.</p>}
                        </div>
                    </div>
                </aside>

                {/* Player Grid Area & Auction Block */}
                <section className="flex-1 flex flex-col h-full overflow-y-auto relative custom-scrollbar">

                    {/* LIVE AUCTION TICKET */}
                    {sessionStatus !== 'MATCHES' && (
                        <div className="bg-[#1c2e24] w-full p-6 border-b border-primary/20 shrink-0 sticky top-0 z-20 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-primary font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(43,238,121,0.5)]"></span>
                                    Currently on the Block
                                </h3>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">groups</span>
                                    Pending in Pool: <span className="text-white">{unsoldPlayers.length}</span>
                                </div>
                            </div>

                            {!activePlayer ? (
                                <div className="bg-black/40 border border-white/5 rounded-xl p-8 text-center flex flex-col items-center gap-3 w-full max-w-2xl mx-auto shadow-inner">
                                    <span className="material-symbols-outlined text-slate-500 text-4xl">hourglass_bottom</span>
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Waiting for Host to draw...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-6 bg-black/50 border border-primary/30 rounded-2xl p-6 relative overflow-hidden w-full max-w-4xl mx-auto backdrop-blur-sm">
                                    {state.status === 'SOLD' && (
                                        <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm z-10 flex items-center justify-center">
                                            <span className="text-6xl font-black uppercase text-green-400 transform -rotate-12 border-4 border-green-400 p-4 rounded-xl shadow-[0_0_50px_rgba(43,238,121,0.3)]">SOLD</span>
                                        </div>
                                    )}
                                    {state.status === 'UNSOLD' && (
                                        <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm z-10 flex items-center justify-center">
                                            <span className="text-6xl font-black uppercase text-red-400 transform rotate-6 border-4 border-red-400 p-4 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.3)]">UNSOLD</span>
                                        </div>
                                    )}
                                    <div className="w-24 h-24 bg-gradient-to-t from-slate-900 to-slate-800 rounded-full flex items-center justify-center shrink-0 border-2 border-primary/50 text-slate-500 shadow-xl">
                                        <span className="material-symbols-outlined text-5xl">person</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-4xl font-black text-white truncate tracking-tight mb-2">{activePlayer.name}</h2>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="bg-white/10 px-3 py-1.5 rounded font-bold tracking-wider">{activePlayer.role === 'BAT' ? 'BATSMAN' : activePlayer.role === 'BOWL' ? 'BOWLER' : activePlayer.role === 'WK' ? 'WICKET KEEPER' : 'ALL-ROUNDER'}</span>
                                            <span className="bg-white/10 px-3 py-1.5 rounded font-bold tracking-wider">{activePlayer.nationality}</span>
                                            <span className={`px-3 py-1.5 rounded font-bold tracking-wider ${activePlayer.category === 'STAR' ? 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30' : activePlayer.category === 'CONSISTENT' ? 'text-blue-400 bg-blue-500/20 border border-blue-500/30' : activePlayer.category === 'VOLATILE' ? 'text-purple-400 bg-purple-500/20 border border-purple-500/30' : 'text-slate-400 bg-white/10 border border-white/5'}`}>{activePlayer.category} tier</span>
                                        </div>
                                    </div>
                                    <div className="text-right border-l border-white/10 pl-8 shrink-0 flex flex-col justify-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Asking Price</div>
                                        <div className="text-4xl font-black text-white tracking-tighter drop-shadow-md">₹{activePlayer.base_price.toFixed(2)} <span className="text-xl text-slate-500 font-bold">Cr</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Acquired Roster Area */}
                    <div className="p-6 md:p-8 relative z-0 max-w-7xl mx-auto w-full flex-1">
                        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(43, 238, 121, 0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide uppercase">
                                    <span className="material-symbols-outlined text-primary">groups</span>
                                    Acquired Roster
                                </h2>
                                <p className="text-slate-400 text-sm mt-1 font-medium">Your confirmed physical auction buys ({roster.length}/11 minimum)</p>
                            </div>
                        </div>

                        {roster.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/20 rounded-3xl bg-black/20 text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">gavel</span>
                                <h2 className="text-2xl font-bold text-slate-400">Your Roster is Empty</h2>
                                <p className="text-slate-500 mt-2">Wait for the Host to allocate winning bids to your team.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {roster.map((r) => (
                                    <PlayerCard
                                        key={r.players.id}
                                        name={r.players.name}
                                        role={r.players.role}
                                        price={r.bought_for}
                                        nationality={r.players.nationality}
                                        category={r.players.category}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function QuotaProgress({ label, current, min, color }: { label: string, current: number, min: number, color: string }) {
    const percent = Math.min(100, (current / min) * 100);
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-sm font-bold uppercase tracking-wider">{label}</span>
                <span className="text-white font-bold">{current}<span className="text-slate-500 font-normal">/{min} Min</span></span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
}

function PlayerCard({ name, role, price, category }: any) {
    const isStar = category === 'STAR';

    return (
        <div className="group relative bg-surface-dark border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-colors duration-300">
            {isStar && (
                <div className="absolute top-0 right-0 p-3 z-10">
                    <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded border border-yellow-500/30">STAR</span>
                </div>
            )}

            <div className="flex flex-col p-5 gap-4">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-t from-gray-800 to-gray-700 flex items-center justify-center shrink-0 border border-white/10">
                        <span className="material-symbols-outlined text-3xl text-slate-500">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white text-xl font-bold truncate leading-tight tracking-tight">{name}</h3>
                        <p className="text-primary/80 text-sm font-medium mt-0.5">{role === 'BAT' ? 'Batsman' : role === 'BOWL' ? 'Bowler' : role === 'WK' ? 'Wicket Keeper' : 'All Rounder'}</p>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-black/40 rounded-xl p-3 border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Bought For</span>
                        <span className="text-white font-bold text-lg">₹ {price.toFixed(2)} Cr</span>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Category</span>
                        <span className={`font-bold text-sm ${category === 'STAR' ? 'text-yellow-400' : category === 'CONSISTENT' ? 'text-blue-400' : category === 'VOLATILE' ? 'text-purple-400' : 'text-slate-400'}`}>
                            {category}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
