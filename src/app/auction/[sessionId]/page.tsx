'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePartySocket from 'partysocket/react';
import { useAuctionStore } from '@/store/auctionStore';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import HostAuthGate from '@/components/HostAuthGate';

interface TeamData {
    id: string;
    session_id: string;
    name: string;
    short_name: string;
    purse: number;
}

interface PlayerData {
    id: string;
    name: string;
    role: string;
    nationality: string;
    category: string;
    base_price: number;
    is_unsold?: boolean;
    base_power?: number;
    batting_stat?: number;
    bowling_stat?: number;
}

export default function LiveAuctionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const { state, updateState } = useAuctionStore();
    const searchParams = useSearchParams();
    const hostName = searchParams.get('host') || 'Host';

    const [teams, setTeams] = useState<TeamData[]>([]);
    const [unsoldPlayers, setUnsoldPlayers] = useState<PlayerData[]>([]);

    // Host Control Form State
    const [finalPrice, setFinalPrice] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const onMessage = useCallback((e: MessageEvent) => {
        const message = JSON.parse(e.data as string);
        if (message.type === 'SYNC') {
            updateState(message.state as Parameters<typeof updateState>[0]);
        }
    }, [updateState]);

    const socket = usePartySocket({
        host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
        room: sessionId,
        onMessage
    });

    const fetchGameData = useCallback(async () => {
        // Fetch Teams for this session
        const { data: teamsData } = await supabase.from('teams')
            .select('*')
            .eq('session_id', sessionId)
            .order('name');

        if (!teamsData) return;
        setTeams(teamsData);

        // Fetch only available players using the optimized RPC
        const { data: availablePlayers, error } = await supabase.rpc('get_available_players', {
            p_session_id: sessionId
        });

        if (error) {
            console.error("Error fetching available players:", error);
            return;
        }

        setUnsoldPlayers(availablePlayers as unknown as PlayerData[]);
    }, [sessionId]);

    useEffect(() => {
        const load = async () => {
            await fetchGameData();
        };
        load();
    }, [fetchGameData]);

    const activePlayer = (state.currentPlayerId && state.status !== 'WAITING')
        ? unsoldPlayers.find(p => p.id === state.currentPlayerId)
        : null;

    // Sync activePlayer display with PartyKit state
    useEffect(() => {
        const syncForm = async () => {
            if (state.status === 'WAITING') {
                setFinalPrice('');
                setSelectedTeamId('');
                setIsProcessing(false);
            } else if (state.currentPlayerId && unsoldPlayers.length > 0) {
                const p = unsoldPlayers.find(p => p.id === state.currentPlayerId);
                if (p) {
                    setFinalPrice(prev => prev || p.base_price.toString());
                }
            }
        };
        syncForm();
    }, [state.status, state.currentPlayerId, unsoldPlayers]);

    const handleDrawNextPlayer = (category?: string) => {
        let pool = unsoldPlayers;
        if (category === 'UNSOLD') {
            pool = unsoldPlayers.filter(p => p.is_unsold === true);
        } else if (category) {
            pool = unsoldPlayers.filter(p => p.category === category && !p.is_unsold);
        }

        if (pool.length === 0) {
            alert(`No ${category ? category : ''} players left in the draft pool!`);
            return;
        }

        // Randomly pick an unsold player
        const randIndex = Math.floor(Math.random() * pool.length);
        const p = pool[randIndex];

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

        if (!winningTeam) {
            alert("Team not found!");
            setIsProcessing(false);
            return;
        }

        if (winningTeam.purse < parsedPrice) {
            alert("Insufficient purse for this team!");
            setIsProcessing(false);
            return;
        }

        if (!activePlayer) {
            alert("No active player on the block.");
            setIsProcessing(false);
            return;
        }

        try {
            // 1. Double check purse one last time before starting
            if (winningTeam.purse < parsedPrice) {
                alert("Insufficient purse!");
                setIsProcessing(false);
                return;
            }

            // 2. Perform DB Updates sequentially (Simulated transaction)
            // First, deduct the purse
            const newPurse = Number((winningTeam.purse - parsedPrice).toFixed(2));
            const { error: purseError } = await supabase
                .from('teams')
                .update({ purse: newPurse })
                .eq('id', selectedTeamId);

            if (purseError) throw new Error("Failed to update purse");

            // Second, insert into roster
            const { error: rosterError } = await supabase
                .from('team_rosters')
                .insert({
                    team_id: selectedTeamId,
                    player_id: activePlayer.id,
                    bought_for: parsedPrice
                });

            if (rosterError) {
                // Rollback purse if roster fails
                await supabase.from('teams').update({ purse: winningTeam.purse }).eq('id', selectedTeamId);
                throw new Error("Failed to update roster");
            }

            // 3. ONLY after DB is successful, notify the room via WebSockets
            socket.send(JSON.stringify({
                type: 'ALLOCATE_PLAYER',
                playerId: activePlayer.id,
                teamId: selectedTeamId,
                amount: parsedPrice
            }));

            // 4. Refresh local team data to update UI
            await fetchGameData();

            // 5. Visual delay for the "SOLD" animation before resetting
            setTimeout(() => {
                socket.send(JSON.stringify({ type: 'SHOW_PLAYER', playerId: null, basePrice: 0 }));
            }, 3000);

        } catch (error: unknown) {
            console.error("Critical Allocation Error:", error);
            const err = error as Error;
            alert(`Allocation Failed: ${err.message || 'Unknown Error'}. The player is still active.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePass = async () => {
        if (!activePlayer) return;
        setIsProcessing(true);

        try {
            // 1. Calculate the new depreciated price (20% penalty, minimum 0.5 Cr)
            const currentPriceStr = finalPrice || activePlayer.base_price.toString();
            const currentPrice = parseFloat(currentPriceStr) || activePlayer.base_price;
            const discountedPrice = Math.max(0.50, Number((currentPrice * 0.8).toFixed(2)));

            // 2. Persist the depreciation to the database so they appear cheaper in the pool
            await supabase
                .from('players')
                .update({ base_price: discountedPrice, is_unsold: true })
                .eq('id', activePlayer.id);

            // 3. Notify the room
            socket.send(JSON.stringify({ type: 'MARK_UNSOLD', playerId: activePlayer.id }));

            // 4. Refresh local table to get the new base_price into the unsold pool
            await fetchGameData();

            setTimeout(() => {
                // Refresh to waiting state after a brief visual delay to see 'Unsold'
                socket.send(JSON.stringify({ type: 'SHOW_PLAYER', playerId: null, basePrice: 0 }));
            }, 1500);
        } catch (error) {
            console.error("Error declaring unsold player:", error);
            alert("Database Error!");
        } finally {
            setIsProcessing(false);
        }
    };

    // Derived counts for Host UI
    const starCount = unsoldPlayers.filter(p => p.category === 'STAR' && !p.is_unsold).length;
    const consistentCount = unsoldPlayers.filter(p => p.category === 'CONSISTENT' && !p.is_unsold).length;
    const volatileCount = unsoldPlayers.filter(p => p.category === 'VOLATILE' && !p.is_unsold).length;
    const weakCount = unsoldPlayers.filter(p => p.category === 'WEAK' && !p.is_unsold).length;
    const unsoldCategoryCount = unsoldPlayers.filter(p => p.is_unsold).length;

    return (
        <HostAuthGate sessionId={sessionId}>
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
                                    <span className="material-symbols-outlined text-6xl text-slate-700 mb-2">hourglass_empty</span>
                                    <p className="text-slate-400 text-center font-bold tracking-widest uppercase text-xs mb-2">No player on the block.</p>

                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <button
                                            onClick={() => handleDrawNextPlayer('STAR')}
                                            disabled={starCount === 0}
                                            className="h-14 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 font-bold text-sm rounded-xl transition-all shadow-lg flex flex-col justify-center items-center disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <span className="leading-none">STAR</span>
                                            <span className="text-[10px] text-yellow-400/70">{starCount} Left</span>
                                        </button>
                                        <button
                                            onClick={() => handleDrawNextPlayer('CONSISTENT')}
                                            disabled={consistentCount === 0}
                                            className="h-14 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-bold text-sm rounded-xl transition-all shadow-lg flex flex-col justify-center items-center disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <span className="leading-none">CONSISTENT</span>
                                            <span className="text-[10px] text-blue-400/70">{consistentCount} Left</span>
                                        </button>
                                        <button
                                            onClick={() => handleDrawNextPlayer('VOLATILE')}
                                            disabled={volatileCount === 0}
                                            className="h-14 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-bold text-sm rounded-xl transition-all shadow-lg flex flex-col justify-center items-center disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <span className="leading-none">VOLATILE</span>
                                            <span className="text-[10px] text-purple-400/70">{volatileCount} Left</span>
                                        </button>
                                        <button
                                            onClick={() => handleDrawNextPlayer('WEAK')}
                                            disabled={weakCount === 0}
                                            className="h-14 bg-slate-700 focus:bg-slate-600 hover:bg-slate-600 text-slate-300 border border-slate-600 font-bold text-sm rounded-xl transition-all shadow-lg flex flex-col justify-center items-center disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <span className="leading-none">WEAK</span>
                                            <span className="text-[10px] text-slate-400">{weakCount} Left</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleDrawNextPlayer('UNSOLD')}
                                        disabled={unsoldCategoryCount === 0}
                                        className="w-full mt-2 h-14 bg-red-500/20 focus:bg-red-500/30 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold text-sm rounded-xl transition-all shadow-lg flex flex-col justify-center items-center disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <span className="flex items-center gap-1 leading-none"><span className="material-symbols-outlined text-[14px]">refresh</span> DISCOUNTED (UNSOLD)</span>
                                        <span className="text-[10px] text-red-400/70">{unsoldCategoryCount} Left</span>
                                    </button>

                                    <button
                                        onClick={() => handleDrawNextPlayer()}
                                        disabled={unsoldPlayers.length === 0}
                                        className="w-full mt-2 h-14 bg-primary/20 focus:bg-primary/30 hover:bg-primary/30 text-primary border border-primary/30 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/10 flex justify-center items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-xl border-none">shuffle</span>
                                        Draw Any Random
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

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activePlayer.id}
                                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                                        className="flex-1 flex flex-col items-center justify-center p-12 z-20 text-center w-full relative"
                                    >
                                        <AnimatePresence>
                                            {state.status === 'SOLD' && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 bg-green-500/20 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl"
                                                >
                                                    <motion.div
                                                        initial={{ scale: 3, rotate: -45, opacity: 0 }}
                                                        animate={{ scale: 1, rotate: -12, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                                        className="bg-black text-primary p-8 rounded-3xl border-4 border-primary shadow-[0_0_100px_rgba(43,238,121,0.5)]"
                                                    >
                                                        <h2 className="text-8xl font-black uppercase tracking-tighter">SOLD</h2>
                                                        <p className="text-2xl mt-2 text-white font-bold">{teams.find(t => t.id === selectedTeamId)?.name}</p>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                            {state.status === 'UNSOLD' && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 bg-red-900/40 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl"
                                                >
                                                    <motion.div
                                                        initial={{ scale: 3, rotate: 45, opacity: 0 }}
                                                        animate={{ scale: 1, rotate: 6, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                                        className="bg-black text-red-500 p-8 rounded-3xl border-4 border-red-500"
                                                    >
                                                        <h2 className="text-8xl font-black uppercase tracking-tighter">UNSOLD</h2>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

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

                                        {/* Player Stats Row */}
                                        <div className="flex items-center gap-8 mt-10">
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Batting</span>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className={`w-2 h-6 rounded-full ${i < (activePlayer.batting_stat || 5) ? 'bg-primary' : 'bg-white/10'}`}></div>
                                                    ))}
                                                    <span className="ml-2 text-2xl font-black text-white">{activePlayer.batting_stat || 5}</span>
                                                </div>
                                            </div>
                                            <div className="h-12 w-[1px] bg-white/10"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Bowling</span>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className={`w-2 h-6 rounded-full ${i < (activePlayer.bowling_stat || 5) ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                                                    ))}
                                                    <span className="ml-2 text-2xl font-black text-white">{activePlayer.bowling_stat || 5}</span>
                                                </div>
                                            </div>
                                            <div className="h-12 w-[1px] bg-white/10"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Power</span>
                                                <div className="text-4xl font-black text-yellow-500">{activePlayer.base_power || 6}</div>
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
                                    </motion.div>
                                </AnimatePresence>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </HostAuthGate>
    );
}
