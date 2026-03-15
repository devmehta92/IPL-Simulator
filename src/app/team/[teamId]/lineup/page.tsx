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

    // Dynamic Quota Verification: Scales down gracefully if drafted roster doesn't meet minimums
    const draftedWK = roster.filter(r => r.players.role === 'WK').length;
    const draftedBowl = roster.filter(r => r.players.role === 'BOWL').length;

    const requiredTotal = Math.min(11, roster.length);
    const requiredWK = Math.min(1, draftedWK);
    const requiredBowl = Math.min(3, draftedBowl);

    const isValid = selectedIds.size === requiredTotal && wkCount >= requiredWK && bowlerCount >= requiredBowl;

    const handleSaveLineup = async () => {
        if (!isValid || isSaving) return;
        setIsSaving(true);

        try {
            // Atomic update via RPC to avoid data corruption
            const { error } = await supabase.rpc('lock_team_lineup', {
                p_team_id: teamId,
                p_player_ids: Array.from(selectedIds)
            });

            if (error) throw error;

            alert("Lineup Locked Successfully!");
            router.push(`/team/${teamId}`);
        } catch (error) {
            console.error("Error saving lineup", error);
            alert("Failed to save lineup. Please try again.");
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
                        <span className={`text-xl font-black ${selectedIds.size === requiredTotal ? 'text-primary' : 'text-amber-500'}`}>{selectedIds.size} / {requiredTotal}</span>
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
                        <QuotaMetric label={`Wicket Keeper (Min ${requiredWK})`} count={wkCount} min={requiredWK} color="text-purple-400" />
                        <QuotaMetric label={`Bowlers (Min ${requiredBowl})`} count={bowlerCount} min={requiredBowl} color="text-blue-400" />
                        <QuotaMetric label="Batters" count={batterCount} min={0} color="text-primary" />
                        <QuotaMetric label="All-Rounders" count={arCount} min={0} color="text-amber-400" />
                    </div>
                    {!isValid && selectedIds.size === requiredTotal && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 font-bold text-sm">
                            <span className="material-symbols-outlined">warning</span> You must meet all minimum role requirements based on your drafted roster.
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
