'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cricketer, DiceRollResult } from '@/game/matchEngine';
import { TeamData, LogEntry } from '@/types';

interface MatchState {
    innings: 1 | 2;
    battingTeamId: string;
    bowlingTeamId: string;
    team1Score: { runs: number, balls: number };
    team2Score: { runs: number, balls: number };
    target: number | null;
    status: 'IN_PROGRESS' | 'FINISHED';
    winner: string | null;
}

const defaultBatter: Cricketer = { id: 'b1', name: 'Bench Batter', role: 'BAT', category: 'CONSISTENT', basePower: 6, modifiers: {}, traits: [] };
const defaultBowler: Cricketer = { id: 'bw1', name: 'Bench Bowler', role: 'BOWL', category: 'CONSISTENT', basePower: 6, modifiers: {}, traits: [] };

export default function SpectatorMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
    const { matchId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const myTeamId = searchParams.get('myTeamId');

    const [teamA, setTeamA] = useState<TeamData | null>(null);
    const [teamB, setTeamB] = useState<TeamData | null>(null);

    // Live Match State
    const [gameState, setGameState] = useState<MatchState>({
        innings: 1,
        battingTeamId: '',
        bowlingTeamId: '',
        team1Score: { runs: 0, balls: 0 },
        team2Score: { runs: 0, balls: 0 },
        target: null,
        status: 'IN_PROGRESS',
        winner: null
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null);
    const [activeBatter, setActiveBatter] = useState<Cricketer>(defaultBatter);
    const [activeBowler, setActiveBowler] = useState<Cricketer>(defaultBowler);

    const MAX_BALLS = 11; // 1 Roll per 11 squad members

    useEffect(() => {
        const fetchMatch = async () => {
            const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
            if (match) {
                const { data: ta } = await supabase.from('teams').select('*').eq('id', match.team_a_id).single();
                const { data: tb } = await supabase.from('teams').select('*').eq('id', match.team_b_id).single();
                setTeamA(ta);
                setTeamB(tb);

                // Initialize Game State
                if (match.status === 'SCHEDULED' || !match.result?.state) {
                    supabase.from('matches').update({ status: 'IN_PROGRESS' }).eq('id', matchId).then();
                    setGameState(prev => ({
                        ...prev,
                        battingTeamId: ta.id,
                        bowlingTeamId: tb.id,
                        team1Score: { runs: 0, balls: 0 },
                        team2Score: { runs: 0, balls: 0 },
                    }));
                } else if (match.status === 'FINISHED') {
                    setGameState(match.result.state);
                }
            }
        };
        fetchMatch();
    }, [matchId]);

    // Spectator Sync Hook
    useEffect(() => {
        const channel = supabase.channel(`match_${matchId}`)
            .on(
                'broadcast',
                { event: 'LIVE_UPDATE' },
                (payload) => {
                    const { gameState: newGameState, activeBatter: newBatter, activeBowler: newBowler, lastRoll: newRoll, logEntry } = payload.payload;

                    setGameState(prev => {
                        const isFirstInningsPrev = prev.innings === 1;
                        if (logEntry) setLogs(l => [logEntry, ...l].slice(0, 15));

                        // Inject local break logs for spectator if innings status flipped
                        if (isFirstInningsPrev && newGameState.innings === 2) {
                            setTimeout(() => {
                                setLogs(l => [{ isBreak: true, msg: `Innings Break! Target is ${newGameState.target}` }, ...l].slice(0, 15));
                            }, 0);
                        } else if (newGameState.status === 'FINISHED' && prev.status !== 'FINISHED') {
                            setTimeout(() => {
                                let winMsg = `MATCH OVER!`;
                                if (newGameState.winner === 'TIE') winMsg = `MATCH OVER! It's a TIE!`;
                                else if (newGameState.winner === newGameState.battingTeamId) winMsg = `MATCH OVER! Chasing team wins!`;
                                else winMsg = `MATCH OVER! Defending team wins!`;
                                setLogs(l => [{ isBreak: true, msg: winMsg }, ...l].slice(0, 15));
                            }, 0);
                        }
                        return newGameState;
                    });

                    setActiveBatter(newBatter);
                    setActiveBowler(newBowler);
                    setLastRoll(newRoll);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);



    if (!teamA || !teamB) return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center text-primary">Loading Match...</div>;

    const currentScore = gameState.innings === 1 ? gameState.team1Score : gameState.team2Score;
    const battingTeam = gameState.battingTeamId === teamA.id ? teamA : teamB;
    const bowlingTeam = gameState.bowlingTeamId === teamA.id ? teamA : teamB;

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden h-screen flex flex-col font-display selection:bg-primary selection:text-background-dark">
            {/* Top Navigation / Header */}
            <header className="relative z-10 w-full bg-[#1c3326]/70 backdrop-blur-md border border-white/10 px-8 py-4 flex items-center justify-between shrink-0 h-20 shadow-lg">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-3xl">sports_cricket</span>
                        <span className="text-xl font-black tracking-tighter uppercase">Virtual Match</span>
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full flex flex-col justify-center items-center">
                    <div className="bg-[#233d2f] px-6 py-1 rounded-b-xl border-b border-x border-white/10 shadow-lg">
                        <span className="text-white font-bold text-lg">BALL {Math.min(currentScore.balls + 1, MAX_BALLS)} OF {MAX_BALLS}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {gameState.target && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-xs font-bold text-slate-400 uppercase">Target</span>
                            <span className="text-lg font-bold text-white">{gameState.target}</span>
                        </div>
                    )}
                    <button
                        onClick={() => router.push('/standings')}
                        className="bg-primary hover:bg-green-400 text-background-dark font-bold px-5 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">exit_to_app</span>
                        <span className="text-sm">Exit to Standings</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="relative z-10 flex flex-1 w-full gap-6 p-6 h-[calc(100vh-80px)]">
                {/* Left Panel: Batting Team */}
                <section className="flex-1 flex flex-col gap-4">
                    <div className="bg-[#1c3326]/70 backdrop-blur-md p-6 rounded-2xl border border-white/10 border-l-4 border-l-primary flex items-center justify-between relative overflow-hidden group h-32 shrink-0">
                        <div className="flex items-center gap-5 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-primary text-sm">sports_baseball</span>
                                    <span className="text-primary text-xs font-bold tracking-widest uppercase">BATTING ({gameState.innings === 1 ? '1st' : '2nd'} INN)</span>
                                </div>
                                <h2 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-white uppercase leading-none truncate w-48">{battingTeam.name}</h2>
                            </div>
                        </div>
                        <div className="text-right relative z-10">
                            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {currentScore.runs}
                            </div>
                            <div className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Total Score</div>
                        </div>
                    </div>

                    {/* Active Batter Area */}
                    <div className="bg-[#1c3326]/70 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex-none relative flex flex-col justify-center items-center text-center h-48">
                        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">On Strike</h3>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{activeBatter.name}</h2>
                        <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded mt-2 text-[10px] font-black tracking-widest uppercase">{activeBatter.category}</span>
                    </div>

                    {/* Event Logs */}
                    <div className="bg-[#1c3326]/70 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex-1 relative flex flex-col overflow-y-auto custom-scrollbar">
                        <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-2">Match Feed</h3>
                        <div className="flex flex-col gap-3 pr-2">
                            {logs.map((log, i) => {
                                if (typeof log === 'string') {
                                    return (
                                        <div key={i} className="p-3 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-lg">
                                            {log}
                                        </div>
                                    );
                                }

                                if (log.isBreak || !log.details) {
                                    return (
                                        <div key={i} className="p-3 rounded-lg border bg-surface-dark border-white/20 shadow-lg text-white font-bold text-center uppercase tracking-widest text-xs my-2">
                                            {log.msg || 'Event Recorded'}
                                        </div>
                                    );
                                }

                                const details = log.details;
                                return (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-black/60 border-primary shadow-[0_0_15px_rgba(43,238,121,0.15)]' : 'bg-black/30 border-white/5 opacity-80'} transition-all`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded">BALL {log.ball}/{log.maxBalls}</span>
                                            <span className={`text-xl font-black ${details.netResult > 0 ? 'text-green-400' : details.netResult < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                {details.netResult > 0 ? `+${details.netResult}` : details.netResult}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            {/* Batting Breakdown */}
                                            <div className="flex flex-col bg-white/5 p-2 rounded border border-white/5">
                                                <span className="text-slate-400 font-bold truncate">{details.eventDescription.split(' vs ')[0].split(' (')[0]}</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-slate-500">Roll: <span className="text-white font-bold">{details.battingRoll}</span></span>
                                                    <span className="text-primary">Mult: <span className="text-primary font-bold">x{details.batMultiplier}</span></span>
                                                </div>
                                                <div className="text-right mt-1 pt-1 border-t border-white/10 text-white font-black">
                                                    = {details.batScore}
                                                </div>
                                            </div>

                                            {/* Bowling Breakdown */}
                                            <div className="flex flex-col bg-white/5 p-2 rounded border border-white/5">
                                                <span className="text-slate-400 font-bold truncate">{details.eventDescription.split(' vs ')[1].split(' (')[0]}</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-slate-500">Roll: <span className="text-white font-bold">{details.bowlingRoll}</span></span>
                                                    <span className="text-blue-400">Mult: <span className="text-blue-400 font-bold">x{details.bowlMultiplier}</span></span>
                                                </div>
                                                <div className="text-right mt-1 pt-1 border-t border-white/10 text-white font-black">
                                                    = {details.bowlScore}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Center: Play Ball Match Engine Controller */}
                <section className="w-[450px] shrink-0 flex flex-col gap-4">
                    <div className="flex-1 bg-[#233d2f] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col">

                        {/* Current Roll Visuals */}
                        <div className="h-64 bg-black/40 border-b border-white/10 p-6 flex flex-col justify-center gap-6 relative">
                            {lastRoll ? (
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-primary font-bold text-xs uppercase tracking-widest">Bat Roll</span>
                                        <div className="size-24 bg-gradient-to-br from-slate-800 to-black rounded-xl border-2 border-primary flex items-center justify-center shadow-[0_0_20px_rgba(43,238,121,0.3)]">
                                            <span className="text-6xl font-black text-white">{lastRoll.battingRoll}</span>
                                        </div>
                                    </div>

                                    <div className="text-center w-32 shrink-0">
                                        <span className="block text-4xl font-black text-white mb-2 drop-shadow-md">
                                            {lastRoll.netResult > 0 ? `+${lastRoll.netResult}` : lastRoll.netResult}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-black/50 px-2 py-1 rounded-full border border-white/5">Net Value</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">Bowl Roll</span>
                                        <div className="size-24 bg-gradient-to-br from-slate-800 to-black rounded-xl border-2 border-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                            <span className="text-6xl font-black text-white">{lastRoll.bowlingRoll}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 font-medium">Click PLAY BALL to start the innings...</div>
                            )}

                            {lastRoll?.isVolatile && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                                    Volatility Multiplier!
                                </div>
                            )}
                        </div>

                        {/* Control Actions */}
                        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                            {gameState.status === 'IN_PROGRESS' ? (
                                <>
                                    <h2 className="text-xl font-bold text-slate-300 uppercase tracking-widest mb-6">Match Engine</h2>
                                    <div className="w-full bg-black/40 border border-primary/30 rounded-2xl py-8 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                                        {myTeamId === battingTeam.id ? (
                                            <button
                                                onClick={() => {
                                                    supabase.channel(`match_${matchId}`).send({
                                                        type: 'broadcast',
                                                        event: 'CONDUCT_ROLL',
                                                        payload: { teamId: myTeamId }
                                                    });
                                                }}
                                                className="w-full bg-primary hover:bg-green-400 text-background-dark rounded-2xl text-4xl font-black tracking-widest shadow-[0_0_40px_rgba(43,238,121,0.3)] transition-all transform active:scale-95 py-8 border-b-4 border-green-600 hover:border-green-500 absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                                            >
                                                ROLL DICE
                                            </button>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                                                <span className="material-symbols-outlined text-primary text-5xl animate-bounce">sensors</span>
                                                <div className="text-center relative z-10">
                                                    <span className="text-white font-bold text-lg block">Live Feed Connected</span>
                                                    <span className="text-primary font-bold uppercase tracking-widest text-xs">Waiting for {battingTeam.name} to roll...</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex w-full flex-col items-center justify-center text-center gap-6">
                                    <div className="text-5xl font-black text-primary drop-shadow-[0_0_20px_rgba(43,238,121,0.5)] tracking-tighter">MATCH OVER</div>
                                    <div className="text-2xl font-bold text-white p-6 bg-black/50 border border-white/10 rounded-2xl w-full shadow-inner">
                                        {gameState.winner === 'TIE' ? <span className="text-yellow-400">IT&apos;S A TIE!</span> :
                                            <span className="text-green-400">{gameState.winner === teamA.id ? teamA.name : teamB.name} WINS!</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Right Panel: Bowling Team Info */}
                <section className="flex-1 flex flex-col gap-4">
                    <div className="bg-[#1c3326]/70 backdrop-blur-md p-6 rounded-2xl border border-white/10 border-r-4 border-r-blue-500 flex items-center justify-end relative overflow-hidden h-32 shrink-0">
                        <div className="text-right relative z-10 w-full flex justify-between items-center">
                            <div className="text-left">
                                <div className="text-4xl font-bold text-white tracking-tighter" style={{ opacity: gameState.innings === 2 ? 1 : 0.5 }}>
                                    {gameState.innings === 2 ? gameState.team1Score.runs : '-'}
                                </div>
                                <div className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{gameState.innings === 1 ? 'Yet to Bat' : '1st Inn Target'}</div>
                            </div>
                            <div>
                                <div className="flex items-center justify-end gap-2 mb-1">
                                    <span className="text-blue-400 text-xs font-bold tracking-widest uppercase">BOWLING</span>
                                    <span className="material-symbols-outlined text-blue-400 text-sm">sports_handball</span>
                                </div>
                                <h2 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-white uppercase leading-none truncate w-48">{bowlingTeam.name}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Active Bowler Area */}
                    <div className="bg-[#1c3326]/70 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex-none relative flex flex-col justify-center items-center text-center h-48">
                        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Bowling</h3>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{activeBowler.name}</h2>
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded mt-2 text-[10px] font-black tracking-widest uppercase">{activeBowler.category}</span>
                    </div>

                    <div className="bg-transparent flex-1 flex flex-col items-center justify-end pb-8">
                        <div className="text-center opacity-50">
                            <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">casino</span>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Random Number Simulator Active</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
