'use client';

import React, { useEffect, useState, use } from 'react';
import usePartySocket from 'partysocket/react';
import { useAuctionStore } from '@/store/auctionStore';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

export default function LiveAuctionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const { state, updateState } = useAuctionStore();
    const searchParams = useSearchParams();
    const hostName = searchParams.get('host') || 'Host';

    const [teams, setTeams] = useState<any[]>([]);
    const [unsoldPlayers, setUnsoldPlayers] = useState<any[]>([]);
    const [activePlayer, setActivePlayer] = useState<any>(null);

    // Host Control Form State
    const [finalPrice, setFinalPrice] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const socket = usePartySocket({
        host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
        room: sessionId,
        onMessage: (e) => {
            const message = JSON.parse(e.data);
            if (message.type === 'SYNC') {
                updateState(message.state);
            }
        }
    });

    const fetchGameData = async () => {
        // Fetch Teams for this session
        const { data: teamsData } = await supabase.from('teams')
            .select('*')
            .eq('session_id', sessionId)
            .order('name');

        if (!teamsData) return;
        setTeams(teamsData);

        // Fetch All Players
        const { data: allPlayers } = await supabase.from('players').select('*');
        if (!allPlayers) return;

        // Fetch All Rosters for these teams (so we know who is sold)
        const teamIds = teamsData.map(t => t.id);
        const { data: rostersData } = await supabase.from('team_rosters')
            .select('player_id')
            .in('team_id', teamIds);

        const soldPlayerIds = new Set(rostersData?.map(r => r.player_id) || []);

        // Unsold Queue items from PartyKit State might have depreciated prices, but let's just find base available
        const available = allPlayers.filter(p => !soldPlayerIds.has(p.id));
        setUnsoldPlayers(available);
    };

    useEffect(() => {
        fetchGameData();
    }, [sessionId]);

    // Sync activePlayer display with PartyKit state
    useEffect(() => {
        if (state.currentPlayerId && unsoldPlayers.length > 0) {
            const p = unsoldPlayers.find(p => p.id === state.currentPlayerId);
            if (p) {
                setActivePlayer(p);
                if (!finalPrice || state.status === 'WAITING') {
                    setFinalPrice(p.base_price.toString());
                }
            }
        } else if (!state.currentPlayerId || state.status === 'WAITING') {
            setActivePlayer(null);
        }

        // If state changed to waiting (e.g. initial load), clear out local states
        if (state.status === 'WAITING') {
            setFinalPrice('');
            setSelectedTeamId('');
            setIsProcessing(false);
        }
    }, [state.currentPlayerId, unsoldPlayers, state.status]);

    const handleDrawNextPlayer = () => {
        if (unsoldPlayers.length === 0) {
            alert("No players left in the draft pool!");
            return;
        }
        // Randomly pick an unsold player
        const randIndex = Math.floor(Math.random() * unsoldPlayers.length);
        const p = unsoldPlayers[randIndex];

        setFinalPrice(p.base_price.toString());
        setSelectedTeamId('');

        socket.send(JSON.stringify({
            type: 'SHOW_PLAYER',
            playerId: p.id,
            basePrice: p.base_price
        }));
    };

    const handleAllocate = async () => {
        if (!selectedTeamId) {
            alert("Select a winning team first!");
            return;
        }
        if (!finalPrice || isNaN(parseFloat(finalPrice))) {
            alert("Enter a valid final price!");
            return;
        }

        setIsProcessing(true);
        const parsedPrice = parseFloat(finalPrice);
        const winningTeam = teams.find(t => t.id === selectedTeamId);

        if (winningTeam && (winningTeam.purse < parsedPrice)) {
            alert("Insufficient purse for this team!");
            setIsProcessing(false);
            return;
        }

        try {
            // 1. Insert into team rosters
            await supabase.from('team_rosters').insert({
                team_id: selectedTeamId,
                player_id: activePlayer.id,
                bought_for: parsedPrice
            });

            // 2. Deduct purse
            const newPurse = (winningTeam.purse - parsedPrice).toFixed(2);
            await supabase.from('teams').update({ purse: newPurse }).eq('id', selectedTeamId);

            // 3. Notify Room to end active block
            socket.send(JSON.stringify({
                type: 'ALLOCATE_PLAYER',
                playerId: activePlayer.id,
                teamId: selectedTeamId,
                amount: parsedPrice
            }));

            // Refresh local team data to update UI instantly
            await fetchGameData();
            setTimeout(() => {
                socket.send(JSON.stringify({ type: 'SHOW_PLAYER', playerId: null, basePrice: 0 })); // Reset board to wait for next draw
            }, 3000);

        } catch (error) {
            console.error("Error allocating player:", error);
            alert("Database Error!");
        }
        setIsProcessing(false);
    };

    const handlePass = () => {
        if (!activePlayer) return;
        socket.send(JSON.stringify({ type: 'MARK_UNSOLD', playerId: activePlayer.id }));

        setTimeout(() => {
            // Refresh to waiting state after a brief visual delay to see 'Unsold'
            socket.send(JSON.stringify({ type: 'SHOW_PLAYER', playerId: null, basePrice: 0 }));
        }, 1500);
    };

    return (
        <div className="bg-[#0a1410] text-slate-100 min-h-screen flex flex-col overflow-hidden font-display">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-surface-dark/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">sports_cricket</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white uppercase">Auction Control Panel</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Host: {hostName} | Session: {sessionId.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={async () => {
                            if (!confirm("Are you sure you want to end the auction and start the tournament?")) return;

                            // 1. Update Session Status
                            await supabase.from('league_sessions').update({ status: 'MATCHES' }).eq('id', sessionId);

                            // 2. Generate Round Robin Matches
                            const matchInserts = [];
                            for (let i = 0; i < teams.length; i++) {
                                for (let j = i + 1; j < teams.length; j++) {
                                    matchInserts.push({
                                        session_id: sessionId,
                                        team_a_id: teams[i].id,
                                        team_b_id: teams[j].id,
                                        status: 'SCHEDULED'
                                    });
                                }
                            }
                            if (matchInserts.length > 0) {
                                await supabase.from('matches').insert(matchInserts);
                            }

                            // 3. Navigate to Standings
                            window.location.href = '/standings';
                        }}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg"
                    >
                        <span className="material-symbols-outlined text-sm">flag</span>
                        Complete Auction
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-red-500 tracking-wider uppercase">Live To Room</span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <p className="text-sm font-medium text-slate-400">Available Players: {unsoldPlayers.length}</p>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 grid grid-cols-12 gap-6 p-6 relative z-10 transition-all">
                {/* Background decorative elements */}
                <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(43, 238, 121, 0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                {/* LEFT PANEL: Host Input Forms */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="flex-1 bg-surface-dark border border-white/10 rounded-2xl p-6 flex flex-col shadow-2xl overflow-hidden relative">
                        {state.status === 'WAITING' || !activePlayer ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <span className="material-symbols-outlined text-6xl text-slate-700">hourglass_empty</span>
                                <p className="text-slate-400 text-center font-medium">No player on the block.</p>
                                <button
                                    onClick={handleDrawNextPlayer}
                                    className="w-full h-16 bg-primary hover:bg-emerald-400 text-background-dark font-black text-xl rounded-xl transition-all shadow-lg shadow-primary/20 flex justify-center items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">shuffle</span>
                                    Draw Next Player
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4">
                                <h2 className="text-primary text-sm font-bold uppercase tracking-wider mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                    <span className="material-symbols-outlined">edit_note</span>
                                    Log Physical Auction
                                </h2>

                                <div className="space-y-6 flex-1">
                                    {/* Price Input */}
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Final Winning Bid (Cr)</label>
                                        <div className="flex items-center">
                                            <span className="text-2xl text-primary font-bold mr-3">₹</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={finalPrice}
                                                onChange={(e) => setFinalPrice(e.target.value)}
                                                className="w-full bg-transparent text-5xl font-black text-white focus:outline-none placeholder:text-slate-700"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Team Select */}
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Award To Team</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {teams.map(team => (
                                                <button
                                                    key={team.id}
                                                    onClick={() => setSelectedTeamId(team.id)}
                                                    className={`p-3 rounded-lg border text-left transition-all ${selectedTeamId === team.id ? 'bg-primary/20 border-primary text-white shadow-[0_0_10px_rgba(43,238,121,0.2)]' : 'bg-surface-dark border-white/10 text-slate-400 hover:border-white/30'}`}
                                                >
                                                    <div className="font-bold truncate text-sm">{team.name}</div>
                                                    <div className="text-xs opacity-70">₹{team.purse} Cr</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 mt-6">
                                    <button
                                        onClick={handlePass}
                                        disabled={isProcessing || state.status !== 'ACTIVE'}
                                        className="h-16 px-6 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold uppercase tracking-wider border border-red-500/20 transition-colors disabled:opacity-50"
                                    >
                                        Pass (Unsold)
                                    </button>
                                    <button
                                        onClick={handleAllocate}
                                        disabled={isProcessing || state.status !== 'ACTIVE'}
                                        className="flex-1 h-16 bg-primary hover:bg-emerald-400 text-background-dark font-black text-xl rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isProcessing ? 'Processing...' : 'Sold! Allocate'}
                                        {!isProcessing && <span className="material-symbols-outlined">gavel</span>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER PANEL: Big TV Player Card */}
                <div className="col-span-8 flex flex-col h-full bg-gradient-to-b from-[#1c2720] to-[#111814] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
                    {!activePlayer ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                            <span className="material-symbols-outlined text-[150px] mb-6">tv</span>
                            <span className="text-3xl font-black uppercase tracking-widest text-[#2bee79]">Awaiting Draw</span>
                        </div>
                    ) : (
                        <>
                            {/* Decorative Outline */}
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <span className="material-symbols-outlined text-[250px] text-white">sports_cricket</span>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center p-12 z-20 text-center animate-in zoom-in-95 duration-500">
                                {state.status === 'SOLD' && (
                                    <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
                                        <div className="bg-black text-primary p-8 rounded-3xl border-4 border-primary shadow-[0_0_100px_rgba(43,238,121,0.5)] transform -rotate-12 animate-in zoom-in slide-in-from-bottom-10 spin-in-12 duration-500">
                                            <h2 className="text-8xl font-black uppercase tracking-tighter">SOLD</h2>
                                            <p className="text-2xl mt-2 text-white font-bold">{teams.find(t => t.id === selectedTeamId)?.name}</p>
                                        </div>
                                    </div>
                                )}
                                {state.status === 'UNSOLD' && (
                                    <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
                                        <div className="bg-black text-red-500 p-8 rounded-3xl border-4 border-red-500 transform rotate-6 animate-in zoom-in duration-300">
                                            <h2 className="text-8xl font-black uppercase tracking-tighter">UNSOLD</h2>
                                        </div>
                                    </div>
                                )}

                                <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full mb-6 relative">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse relative z-10"></span>
                                    <span className="text-primary text-sm font-bold uppercase tracking-widest">Active Lot</span>
                                    {/* Pulse effect */}
                                    <div className="absolute top-1 left-[14px] w-2 h-2 bg-primary rounded-full animate-ping opacity-75"></div>
                                </div>

                                <h1 className="text-6xl justify-center flex items-center gap-4 lg:text-8xl font-black text-white tracking-tight leading-none mb-6">
                                    {activePlayer.name}
                                </h1>

                                <div className="flex items-center gap-6 mt-4">
                                    <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border ${activePlayer.category === 'STAR' ? 'bg-yellow-500/20 border-yellow-500/30' : activePlayer.category === 'CONSISTENT' ? 'bg-blue-500/20 border-blue-500/30' : activePlayer.category === 'VOLATILE' ? 'bg-purple-500/20 border-purple-500/30' : 'bg-slate-500/20 border-slate-500/30'}`}>
                                        <span className={`material-symbols-outlined ${activePlayer.category === 'STAR' ? 'text-yellow-400' : activePlayer.category === 'CONSISTENT' ? 'text-blue-400' : activePlayer.category === 'VOLATILE' ? 'text-purple-400' : 'text-slate-400'}`}>
                                            {activePlayer.category === 'STAR' ? 'military_tech' : activePlayer.category === 'CONSISTENT' ? 'verified' : activePlayer.category === 'VOLATILE' ? 'local_fire_department' : 'sentiment_satisfied'}
                                        </span>
                                        <span className={`font-black tracking-widest text-lg uppercase ${activePlayer.category === 'STAR' ? 'text-yellow-400' : activePlayer.category === 'CONSISTENT' ? 'text-blue-400' : activePlayer.category === 'VOLATILE' ? 'text-purple-400' : 'text-slate-400'}`}>
                                            {activePlayer.category} tier
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="material-symbols-outlined text-primary">sports_cricket</span>
                                        <span className="text-white font-bold text-xl">{activePlayer.role === 'BAT' ? 'Batsman' : activePlayer.role === 'BOWL' ? 'Bowler' : activePlayer.role === 'WK' ? 'Wicket Keeper' : 'All-Rounder'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="material-symbols-outlined text-blue-400">public</span>
                                        <span className="text-white font-bold text-xl">{activePlayer.nationality}</span>
                                    </div>
                                </div>

                                {/* Active Base Price TV Readout */}
                                <div className="mt-16 bg-black/40 border-2 border-primary/20 p-8 rounded-3xl inline-flex flex-col items-center">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest mb-2">Asking Base Price</span>
                                    <div className="text-7xl font-black text-white" style={{ textShadow: '0 0 20px rgba(43, 238, 121, 0.3)' }}>
                                        <span className="text-4xl align-top text-primary mr-2">₹</span>
                                        {activePlayer.base_price.toFixed(2)}
                                        <span className="text-3xl text-slate-400 font-bold ml-2">Cr</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
