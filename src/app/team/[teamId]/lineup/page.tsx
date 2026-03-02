'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { RosterData, TeamData } from '@/types';

export default function SquadLineupPage({ params }: { params: Promise<{ teamId: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const teamId = resolvedParams.teamId;

    const [team, setTeam] = useState<TeamData | null>(null);
    const [roster, setRoster] = useState<RosterData[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchRoster = async () => {
            setIsLoading(true);
            const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single();
            if (teamData) setTeam(teamData);

            const { data: rosterData } = await supabase
                .from('team_rosters')
                .select(`
                    player_id,
                    bought_for,
                    is_starting,
                    players (*)
                `)
                .eq('team_id', teamId);

            if (rosterData) {
                const mappedRoster = rosterData as unknown as RosterData[];
                setRoster(mappedRoster);

                // Initialize selected ones from previous load (if they were already starting)
                const alreadyStarting = mappedRoster.filter(r => r.is_starting).map(r => r.players.id);
                setSelectedIds(new Set(alreadyStarting));
            }
            setIsLoading(false);
        };
        fetchRoster();
    }, [teamId]);

    const handleSelect = (playerId: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(playerId)) {
            newSet.delete(playerId);
        } else {
            if (newSet.size >= 11) return; // Max 11
            newSet.add(playerId);
        }
        setSelectedIds(newSet);
    };

    // Derived State for Quotas
    const selectedPlayers = roster.filter(r => selectedIds.has(r.players.id));
    const batterCount = selectedPlayers.filter(r => r.players.role === 'BAT').length;
    const bowlerCount = selectedPlayers.filter(r => r.players.role === 'BOWL').length;
    const arCount = selectedPlayers.filter(r => r.players.role === 'AR').length;
    const wkCount = selectedPlayers.filter(r => r.players.role === 'WK').length;

    // Strict Quota Verification (Can be adjusted based on desired rules)
    const isValid = selectedIds.size === 11 && wkCount >= 1 && bowlerCount >= 3;

    const handleSaveLineup = async () => {
        if (!isValid || isSaving) return;
        setIsSaving(true);

        try {
            // Unset all currently starting
            await supabase.from('team_rosters').update({ is_starting: false }).eq('team_id', teamId);

            // Set newly selected as starting
            const selectedArray = Array.from(selectedIds);
            await supabase.from('team_rosters').update({ is_starting: true })
                .eq('team_id', teamId)
                .in('player_id', selectedArray);

            alert("Lineup Locked Successfully!");
            router.push(`/team/${teamId}`);
        } catch (error) {
            console.error("Error saving lineup", error);
            alert("Failed to save lineup");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-background-dark text-primary font-bold fade-in">Loading Roster...</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-y-auto h-screen flex flex-col">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-center justify-between border-b border-solid border-slate-200 dark:border-[#28392f] px-6 py-5 bg-white dark:bg-surface-dark sticky top-0 z-20 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push(`/team/${teamId}`)} className="text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-3xl">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">{team?.short_name} Builder</span>
                        <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">Match Starting XI</h2>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Selected</span>
                        <span className={`text-xl font-black ${selectedIds.size === 11 ? 'text-primary' : 'text-amber-500'}`}>{selectedIds.size} / 11</span>
                    </div>
                    <button
                        onClick={handleSaveLineup}
                        disabled={!isValid || isSaving}
                        className={`flex min-w-[140px] items-center justify-center rounded-xl h-12 px-6 font-extrabold text-lg transition-all ${isValid ? 'bg-primary hover:bg-green-400 text-background-dark shadow-[0_0_15px_rgba(43,238,121,0.3)] cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                    >
                        {isSaving ? 'SAVING...' : 'LOCK SQUAD'}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full gap-8">
                {/* Quota Tracker */}
                <div className="bg-surface-dark rounded-2xl p-6 border border-white/10 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">analytics</span> Squad Balance
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <QuotaMetric label="Wicket Keeper (Min 1)" count={wkCount} min={1} color="text-purple-400" />
                        <QuotaMetric label="Bowlers (Min 3)" count={bowlerCount} min={3} color="text-blue-400" />
                        <QuotaMetric label="Batters" count={batterCount} min={0} color="text-primary" />
                        <QuotaMetric label="All-Rounders" count={arCount} min={0} color="text-amber-400" />
                    </div>
                    {!isValid && selectedIds.size === 11 && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 font-bold text-sm">
                            <span className="material-symbols-outlined">warning</span> You must meet all minimum role requirements (1 WK, 3 Bowlers).
                        </div>
                    )}
                </div>

                {/* Player List */}
                <div className="flex flex-col gap-3 pb-12">
                    <h3 className="text-xl font-bold flex justify-between items-center px-1">
                        Select Players
                        <span className="text-sm font-normal text-slate-400">{roster.length} Drafted in Squad</span>
                    </h3>

                    {roster.map((playerRecord) => {
                        const p = playerRecord.players;
                        const isSelected = selectedIds.has(p.id);

                        return (
                            <div
                                key={p.id}
                                onClick={() => handleSelect(p.id)}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(43,238,121,0.1)]' : 'bg-surface-dark border-transparent hover:border-slate-700'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${isSelected ? 'border-primary bg-primary/20 text-primary' : 'bg-background-dark border-slate-700 text-slate-500'}`}>
                                        <span className="material-symbols-outlined">{p.role === 'BAT' ? 'sports_cricket' : p.role === 'BOWL' ? 'sports_baseball' : p.role === 'WK' ? 'sports_handball' : 'star'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold text-white leading-tight">{p.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded ${p.category === 'STAR' ? 'bg-yellow-500/20 text-yellow-400' : p.category === 'CONSISTENT' ? 'bg-blue-500/20 text-blue-400' : p.category === 'VOLATILE' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>{p.category}</span>
                                            <span className="text-xs text-slate-400 font-bold">{p.role}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-primary border-primary text-background-dark' : 'bg-transparent border-slate-600 text-transparent'}`}>
                                        <span className="material-symbols-outlined font-black text-xl">check</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {roster.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center opacity-50">
                            <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                            <span>No players drafted yet. Return to the auction!</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function QuotaMetric({ label, count, min, color }: { label: string, count: number, min: number, color: string }) {
    const isMet = count >= min;
    return (
        <div className={`p-3 rounded-xl border ${isMet ? 'bg-[#1a2c22] border-primary/30' : 'bg-background-dark border-slate-800'}`}>
            <span className="block text-xs font-bold text-slate-400 mb-1">{label}</span>
            <div className={`text-2xl font-black ${isMet ? color : 'text-slate-500'}`}>{count}</div>
        </div>
    );
}
