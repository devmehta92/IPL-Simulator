'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MatchEngine, Cricketer, DiceRollResult, PlayerCategory, PlayerRole } from '@/game/matchEngine';
import { TeamData, RosterData, LogEntry } from '@/types';

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

export default function MatchScoreboardPage({ params }: { params: Promise<{ matchId: string }> }) {
    const { matchId } = use(params);
    const router = useRouter();

    const [teamA, setTeamA] = useState<TeamData | null>(null);
    const [teamB, setTeamB] = useState<TeamData | null>(null);
    const [teamARoster, setTeamARoster] = useState<RosterData[]>([]);
    const [teamBRoster, setTeamBRoster] = useState<RosterData[]>([]);

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

                // Fetch Starting XIs only
                const { data: rosterA } = await supabase.from('team_rosters').select('*, players(*)').eq('team_id', ta.id).eq('is_starting', true);
                const { data: rosterB } = await supabase.from('team_rosters').select('*, players(*)').eq('team_id', tb.id).eq('is_starting', true);
                setTeamARoster(rosterA || []);
                setTeamBRoster(rosterB || []);

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

    const playBall = useCallback(() => {
        if (gameState.status === 'FINISHED') return;

        // Context derived from state closure
        const isFirstInnings = gameState.innings === 1;
        const currentScore = isFirstInnings ? gameState.team1Score : gameState.team2Score;
        const currentBallIndex = currentScore.balls;

        // Safety Check
        if (currentBallIndex >= MAX_BALLS) return;

        const battingRoster = isFirstInnings ? teamARoster : teamBRoster;
        const bowlingRoster = isFirstInnings ? teamBRoster : teamARoster;

        // Extract Players statically by ball index (removed `% length` to force empty slots to appear as Bench Players)
        const batterData = battingRoster[currentBallIndex]?.players;
        const bowlerData = bowlingRoster[currentBallIndex]?.players;

        const engineBatter: Cricketer = { ...defaultBatter, ...batterData, category: (batterData?.category || 'CONSISTENT') as PlayerCategory, role: (batterData?.role || 'BAT') as PlayerRole };
        const engineBowler: Cricketer = { ...defaultBowler, ...bowlerData, category: (bowlerData?.category || 'CONSISTENT') as PlayerCategory, role: (bowlerData?.role || 'BOWL') as PlayerRole };

        // 1. Calculate side-effect once outside of the state setter
        const engine = new MatchEngine();
        const resultDetails = engine.rollDice(engineBatter, engineBowler);

        // 2. Set visual auxiliary states
        setActiveBatter(engineBatter);
        setActiveBowler(engineBowler);
        setLastRoll(resultDetails);

        // 3. Append core log synchronously outside the state atomic updater
        const logEntry = {
            ball: currentBallIndex + 1,
            maxBalls: MAX_BALLS,
            msg: resultDetails.eventDescription,
            details: resultDetails,
            isBreak: false
        };
        setLogs(l => [logEntry, ...l].slice(0, 15));

        // 4. Update the core atomic State machine strictly without mutating prev
        setGameState(prev => {
            const isFirstInningsPrev = prev.innings === 1;

            // MUST Deep Clone Object References to survive React Strict Mode Double-Invoke
            const newTeam1Score = { ...prev.team1Score };
            const newTeam2Score = { ...prev.team2Score };
            const currentScoreObj = isFirstInningsPrev ? newTeam1Score : newTeam2Score;

            if (currentScoreObj.balls >= MAX_BALLS) return prev; // Idempotent check

            // Apply specific immutable action
            currentScoreObj.runs += resultDetails.netResult;
            currentScoreObj.balls += 1;

            const nextState = {
                ...prev,
                team1Score: newTeam1Score,
                team2Score: newTeam2Score
            };

            const isEndOfInnings = currentScoreObj.balls >= MAX_BALLS;
            if (!teamA || !teamB) return nextState;

            if (isFirstInningsPrev && isEndOfInnings) {
                // Transition to Innings 2
                nextState.innings = 2;
                nextState.target = currentScoreObj.runs + 1;
                nextState.battingTeamId = teamB.id;
                nextState.bowlingTeamId = teamA.id;

                // Side effects upon transistion must be escaped to setTimeout
                setTimeout(() => {
                    setLogs(l => [{ isBreak: true, msg: `Innings Break! Target is ${nextState.target}` }, ...l].slice(0, 15));
                    const nextBat = teamBRoster[0]?.players;
                    const nextBowl = teamARoster[0]?.players;
                    if (nextBat) setActiveBatter({ ...defaultBatter, ...nextBat, category: (nextBat.category || 'CONSISTENT') as PlayerCategory, role: (nextBat.role || 'BAT') as PlayerRole });
                    if (nextBowl) setActiveBowler({ ...defaultBowler, ...nextBowl, category: (nextBowl.category || 'CONSISTENT') as PlayerCategory, role: (nextBowl.role || 'BOWL') as PlayerRole });
                    setLastRoll(null);
                }, 0);

            } else if (!isFirstInningsPrev && isEndOfInnings) {
                // Match Over
                nextState.status = 'FINISHED';

                let winMsg = '';
                if (currentScoreObj.runs >= nextState.target!) {
                    nextState.winner = nextState.battingTeamId;
                    winMsg = `MATCH OVER! Chasing team wins!`;
                } else if (currentScoreObj.runs === nextState.target! - 1) {
                    nextState.winner = 'TIE';
                    winMsg = `MATCH OVER! It's a TIE!`;
                } else {
                    nextState.winner = nextState.bowlingTeamId;
                    winMsg = `MATCH OVER! Defending team wins!`;
                }

                setTimeout(() => {
                    setLogs(l => [{ isBreak: true, msg: winMsg }, ...l].slice(0, 15));
                }, 0);

                const finalResult = {
                    teamA_runs: nextState.team1Score.runs,
                    teamA_overs: nextState.team1Score.balls,
                    teamB_runs: nextState.team2Score.runs,
                    teamB_overs: nextState.team2Score.balls,
                    is_tie: nextState.winner === 'TIE',
                    state: nextState
                };

                supabase.from('matches')
                    .update({ status: 'FINISHED', result: finalResult })
                    .eq('id', matchId)
                    .then();
            }

            // BROADCAST LIVE SYNC TO SPECTATOR DEVICES
            supabase.channel(`match_${matchId}`).send({
                type: 'broadcast',
                event: 'LIVE_UPDATE',
                payload: {
                    gameState: nextState,
                    activeBatter: engineBatter,
                    activeBowler: engineBowler,
                    lastRoll: resultDetails,
                    logEntry: logEntry
                }
            });

            return nextState;
        });
    }, [gameState.status, gameState.innings, gameState.team1Score, gameState.team2Score, teamARoster, teamBRoster, matchId, teamA, teamB]);

    // WebSocket Listener for Remote Player Rolls
    useEffect(() => {
        const channel = supabase.channel(`match_${matchId}`);
        channel.on('broadcast', { event: 'CONDUCT_ROLL' }, () => {
            playBall();
        }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, playBall]);

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
                                    <div className="w-full bg-surface-dark border-2 border-dashed border-primary/50 text-white rounded-2xl flex flex-col items-center justify-center py-6 shadow-inner relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                                        <span className="material-symbols-outlined text-4xl text-primary mb-2 animate-bounce">tap_and_play</span>
                                        <span className="text-sm font-bold tracking-widest uppercase text-slate-400">Waiting For</span>
                                        <span className="text-2xl font-black text-white">{battingTeam.name}</span>
                                        <span className="text-xs text-primary mt-2 mb-4">To roll from their device...</span>
                                        <button
                                            onClick={playBall}
                                            className="relative z-10 mt-2 text-xs uppercase font-bold tracking-widest bg-slate-800 hover:bg-red-900/40 hover:border-red-500/50 text-slate-400 hover:text-red-400 px-4 py-2 rounded-full border border-slate-600 transition-colors flex items-center gap-2 group-hover:opacity-100"
                                        >
                                            <span className="material-symbols-outlined text-sm">fast_forward</span>
                                            Force Roll (Override)
                                        </button>
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
