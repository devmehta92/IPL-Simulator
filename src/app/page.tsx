'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Standard IPL Franchise setup
const PREDEFINED_TEAMS = [
  { name: 'Chennai Super Kings', short: 'CSK', color: 'yellow-500' },
  { name: 'Mumbai Indians', short: 'MI', color: 'blue-500' },
  { name: 'Royal Challengers Bengaluru', short: 'RCB', color: 'red-500' },
  { name: 'Kolkata Knight Riders', short: 'KKR', color: 'purple-500' },
  { name: 'Sunrisers Hyderabad', short: 'SRH', color: 'orange-500' },
  { name: 'Gujarat Titans', short: 'GT', color: 'teal-500' },
  { name: 'Delhi Capitals', short: 'DC', color: 'blue-400' },
  { name: 'Rajasthan Royals', short: 'RR', color: 'pink-500' },
  { name: 'Punjab Kings', short: 'PBKS', color: 'red-600' },
  { name: 'Lucknow Super Giants', short: 'LSG', color: 'cyan-500' },
];

export default function Home() {
  const router = useRouter();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [sessionName, setSessionName] = useState('The Boys 2026 Auction');
  const [hostName, setHostName] = useState('');
  const [players, setPlayers] = useState([
    { ownerName: '', teamIdx: 0 },
    { ownerName: '', teamIdx: 1 },
  ]);

  const handleAddPlayer = () => {
    if (players.length >= 10) return;
    setPlayers([...players, { ownerName: '', teamIdx: players.length }]);
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: string, value: any) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const [isJoinMode, setIsJoinMode] = useState(false);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);

  const handleCreateLeague = async () => {
    // ... (existing create logic)
    if (!hostName.trim()) {
      alert("Please enter a Host Name");
      return;
    }
    const validPlayers = players.filter(p => p.ownerName.trim() !== '');
    if (validPlayers.length < 2) {
      alert("You need at least 2 valid player teams to start the auction.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('league_sessions')
        .insert({
          name: sessionName,
          status: 'LOBBY'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      const sessionId = sessionData.id;

      const teamInserts = validPlayers.map(p => {
        const standardTeam = PREDEFINED_TEAMS[p.teamIdx];
        return {
          session_id: sessionId,
          name: `${standardTeam.name} (${p.ownerName})`,
          short_name: standardTeam.short,
          theme_color: standardTeam.color,
          purse: 150.00
        };
      });

      const { error: teamsError } = await supabase.from('teams').insert(teamInserts);
      if (teamsError) throw teamsError;

      router.push(`/auction/${sessionId}?host=${encodeURIComponent(hostName)}`);
    } catch (err: any) {
      console.error("Error creating league:", err);
      alert("Failed to create the league. Check console for details.");
      setIsLoading(false);
    }
  };

  const handleOpenJoinMode = async () => {
    setIsJoinMode(true);
    setIsSetupMode(false);
    setIsLoading(true);

    // Fetch the most recent session's teams (since typically you only play 1 at a time)
    const { data: sessionData } = await supabase
      .from('league_sessions')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionData) {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('session_id', sessionData.id);

      setActiveTeams(teamsData || []);
    }
    setIsLoading(false);
  };


  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-screen w-full overflow-hidden flex flex-col font-display selection:bg-primary selection:text-background-dark">
      {/* Main Container with Background Image */}
      <div
        className="relative flex h-full w-full flex-row overflow-hidden bg-cover bg-center bg-no-repeat group/design-root"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(16, 34, 23, 0.95) 0%, rgba(16, 34, 23, 0.8) 50%, rgba(16, 34, 23, 0.95) 100%), url("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop")`
        }}
      >
        {/* Left Section: Title & Actions/Form */}
        <div className="flex flex-1 flex-col justify-center px-10 py-12 lg:px-20 relative z-10 overflow-y-auto custom-scrollbar">

          {/* Logo/Header Area */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-5xl">sports_cricket</span>
              <span className="text-primary tracking-widest uppercase font-bold text-lg opacity-80">Season 2026</span>
            </div>
            <h1 className="text-white text-5xl font-black leading-tight tracking-[-0.02em] lg:text-7xl drop-shadow-lg">
              IPL TABLETOP<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">LEAGUE</span>
            </h1>
            {!isSetupMode && (
              <p className="mt-6 text-slate-300 text-xl font-normal max-w-xl text-shadow">
                The ultimate live-room physical auction simulation. Gather your friends, be the Host, and manage the 150Cr Team purses on the big screen.
              </p>
            )}
          </div>

          {/* Dynamic Content Area */}
          {!isSetupMode && !isJoinMode ? (
            <div className="flex flex-col gap-5 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={() => setIsSetupMode(true)}
                className="group flex items-center justify-between gap-4 w-full h-20 px-8 bg-primary hover:bg-emerald-400 text-background-dark rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(43,238,121,0.3)] hover:shadow-[0_0_30px_rgba(43,238,121,0.5)]"
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-4xl">gavel</span>
                  <div className="flex flex-col items-start">
                    <span className="text-2xl font-bold uppercase tracking-tight">Host New Game</span>
                    <span className="text-sm font-semibold opacity-70">Setup teams & players</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-3xl transition-transform group-hover:translate-x-1">arrow_forward</span>
              </button>
              <div className="flex gap-4 w-full">
                <button onClick={handleOpenJoinMode} className="group flex flex-1 items-center justify-center gap-3 h-16 px-6 bg-surface-dark/80 backdrop-blur-md border border-slate-700/50 hover:border-primary/50 text-white hover:text-primary rounded-xl transition-all duration-200 hover:bg-surface-darker">
                  <span className="material-symbols-outlined text-2xl">groups</span>
                  <span className="text-lg font-bold">Join the Game</span>
                </button>
              </div>
            </div>
          ) : isSetupMode ? (
            <div className="w-full max-w-2xl bg-surface-dark/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Configure Lobby</h2>
                <button onClick={() => setIsSetupMode(false)} className="text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">League Name</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="w-full bg-background-dark/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Summer Auction '26"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">Host (Your Name)</label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      className="w-full bg-background-dark/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-slate-300 font-bold">Player Teams ({players.length}/10)</label>
                    <button
                      onClick={handleAddPlayer}
                      disabled={players.length >= 10}
                      className="text-primary text-sm font-bold flex items-center gap-1 hover:text-emerald-300 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Add Player
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                    {players.map((p, index) => (
                      <div key={index} className="flex items-center gap-3 bg-background-dark/30 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 font-mono w-6 text-center">{index + 1}</span>
                        <input
                          type="text"
                          value={p.ownerName}
                          onChange={(e) => updatePlayer(index, 'ownerName', e.target.value)}
                          className="flex-1 bg-background-dark/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                          placeholder="Friend's Name"
                        />
                        <select
                          value={p.teamIdx}
                          onChange={(e) => updatePlayer(index, 'teamIdx', parseInt(e.target.value))}
                          className="w-48 bg-background-dark/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                        >
                          {PREDEFINED_TEAMS.map((team, idx) => (
                            <option key={team.short} value={idx}>{team.short} - {team.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemovePlayer(index)}
                          disabled={players.length <= 2}
                          className="text-red-400 hover:text-red-300 p-2 disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleCreateLeague}
                  disabled={isLoading}
                  className="w-full h-14 bg-primary hover:bg-emerald-400 text-background-dark font-bold text-lg rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isLoading ? 'Booting Room...' : 'Open Auction Room'}
                  {!isLoading && <span className="material-symbols-outlined">launch</span>}
                </button>
              </div>
            </div>
          ) : isJoinMode ? (
            <div className="w-full max-w-2xl bg-surface-dark/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Select Your Team</h2>
                <button onClick={() => setIsJoinMode(false)} className="text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-6">If the Host just created the lobby, your team will appear here. Tap your name to access your live Team Dashboard.</p>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                </div>
              ) : activeTeams.length === 0 ? (
                <div className="bg-black/40 p-10 rounded-xl text-center border border-white/5">
                  <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">search_off</span>
                  <p className="text-slate-300 font-bold">No active sessions found.</p>
                  <p className="text-sm text-slate-500">Tell the Host to create a lobby first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {activeTeams.map(t => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/team/${t.id}`)}
                      className="flex items-center gap-4 p-4 bg-background-dark/50 border border-slate-700 hover:border-primary/50 hover:bg-black/50 transition-all rounded-xl text-left group"
                    >
                      <div className="w-12 h-12 bg-black border border-white/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="font-bold text-slate-400 group-hover:text-primary transition-colors">{t.short_name}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{t.name}</h3>
                        <span className="text-primary text-xs font-bold uppercase">Join Dashboard →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Footer Meta */}
          <div className="mt-auto pt-8 flex items-center gap-2 opacity-60">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            <p className="text-slate-300 text-sm font-medium uppercase tracking-wider">Server Status: Online</p>
          </div>
        </div>

        {/* Right Section: Visual Sidebar Feature Highlight */}
        <div className="hidden lg:flex w-[420px] h-full flex-col bg-surface-darker/90 backdrop-blur-xl border-l border-slate-800/50 shadow-2xl relative z-20">
          <div className="p-8 border-b border-slate-800/50 bg-gradient-to-b from-surface-dark/50 to-transparent">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">groups_3</span>
              How to Play (V2)
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <FeatureStep
              icon="cast"
              title="1. Host on the Big Screen"
              desc="The Host creates the lobby and casts this app to a TV. The Host manages all trades manually."
            />
            <FeatureStep
              icon="record_voice_over"
              title="2. Bid in the Room"
              desc="Friends scream out their bids physically in the room. No clicking buttons on phones—real auction hype."
            />
            <FeatureStep
              icon="account_balance_wallet"
              title="3. ₹150 Cr Purses"
              desc="Every person has a strict 150Cr limit to build exactly an 11-man squad with quotas."
            />
            <FeatureStep
              icon="check_circle"
              title="4. Host Allocates"
              desc="When the hammer falls, the Host assigns the player. Purses and quotas auto-sync to everyone's phones immediately."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureStep({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-background-dark/40 border border-slate-800">
      <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div>
        <h3 className="text-white font-bold">{title}</h3>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
