'use client';

import React, { useEffect, useState, use, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { PlayerData } from '@/types';

export default function ScoutingPage({ params }: { params: Promise<{ teamId: string }> }) {
    const { teamId } = use(params);
    const router = useRouter();

    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [watchlist, setWatchlist] = useState<string[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            // Fetch team to verify existence internally
            await supabase.from('teams').select('*').eq('id', teamId).single();

            // Fetch all players
            const { data: allPlayers } = await supabase.from('players').select('*').order('name', { ascending: true });
            if (allPlayers) setPlayers(allPlayers as unknown as PlayerData[]);

            // Load watchlist from local storage
            const savedWatchlist = localStorage.getItem(`watchlist_${teamId}`);
            if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));

            setIsLoading(false);
        };
        loadInitialData();
    }, [teamId]);

    const toggleWatch = (playerId: string) => {
        setWatchlist(prev => {
            const next = prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId];
            localStorage.setItem(`watchlist_${teamId}`, JSON.stringify(next));
            return next;
        });
    };

    const filteredPlayers = useMemo(() => {
        return players.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = !roleFilter || p.role === roleFilter;
            const matchesCategory = !categoryFilter || p.category === categoryFilter;
            return matchesSearch && matchesRole && matchesCategory;
        });
    }, [players, searchTerm, roleFilter, categoryFilter]);

    if (isLoading) return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center text-primary font-bold">Scouting Player Pool...</div>;

    return (
        <div className="bg-[#0a1410] text-slate-100 font-display min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-surface-dark/95 backdrop-blur-md z-30 sticky top-0 w-full">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Scout Player Pool</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                        <span className="material-symbols-outlined text-yellow-500 text-sm">star</span>
                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">{watchlist.length} Watched</span>
                    </div>
                </div>
            </header>

            {/* Filters Bar */}
            <div className="bg-[#111d15] border-b border-white/5 p-6 sticky top-16 z-20 shadow-xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                        <input
                            type="text"
                            placeholder="Search by player name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary transition-all text-white placeholder:text-slate-600"
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="flex gap-2">
                        {['BAT', 'BOWL', 'AR', 'WK'].map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${roleFilter === role ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2">
                        {['STAR', 'CONSISTENT', 'VOLATILE', 'WEAK'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${categoryFilter === cat ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <main className="flex-1 p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Available Talent</h2>
                            <p className="text-white text-2xl font-black">{filteredPlayers.length} Players Found</p>
                        </div>
                    </div>

                    {filteredPlayers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/10 rounded-3xl bg-black/20 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">search_off</span>
                            <h2 className="text-2xl font-bold text-slate-400">No players match your filters</h2>
                            <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredPlayers.map(player => (
                                <ScoutCard
                                    key={player.id}
                                    player={player}
                                    isWatched={watchlist.includes(player.id)}
                                    onToggleWatch={() => toggleWatch(player.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function ScoutCard({ player, isWatched, onToggleWatch }: { player: PlayerData, isWatched: boolean, onToggleWatch: () => void }) {
    return (
        <div className={`relative group bg-surface-dark border ${isWatched ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-white/10 hover:border-primary/50'} rounded-2xl overflow-hidden transition-all duration-300`}>
            <button
                onClick={onToggleWatch}
                className={`absolute top-3 right-3 z-10 size-8 rounded-full flex items-center justify-center transition-all ${isWatched ? 'bg-yellow-500 text-black' : 'bg-black/40 text-slate-500 hover:text-white'}`}
            >
                <span className="material-symbols-outlined text-sm font-bold">{isWatched ? 'star' : 'star_outline'}</span>
            </button>

            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-gradient-to-t from-slate-800 to-slate-700 flex items-center justify-center shrink-0 border border-white/10">
                        <span className="material-symbols-outlined text-2xl text-slate-500">person</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white font-bold truncate leading-tight tracking-tight">{player.name}</h3>
                        <p className="text-primary/80 text-[10px] font-bold uppercase tracking-wider">{player.role} • {player.nationality}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 rounded-lg p-2 border border-white/5">
                        <div className="text-[8px] text-slate-500 uppercase font-black mb-1">Batting</div>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`flex-1 h-1.5 rounded-full ${i < Math.ceil((player.batting_stat || 5) / 2) ? 'bg-primary' : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 bg-black/40 rounded-lg p-2 border border-white/5">
                        <div className="text-[8px] text-slate-500 uppercase font-black mb-1">Bowling</div>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`flex-1 h-1.5 rounded-full ${i < Math.ceil((player.bowling_stat || 5) / 2) ? 'bg-blue-400' : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-black/40 rounded-xl p-3 border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Base Price</span>
                        <span className="text-white font-black">₹{player.base_price.toFixed(2)} Cr</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Tier</span>
                        <span className={`text-[10px] font-black tracking-widest ${player.category === 'STAR' ? 'text-yellow-400' : player.category === 'CONSISTENT' ? 'text-blue-400' : player.category === 'VOLATILE' ? 'text-purple-400' : 'text-slate-400'}`}>
                            {player.category}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
