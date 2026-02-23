import React from 'react';

export default function SquadLineupPage() {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#28392f] px-10 py-5 bg-white dark:bg-[#111814] z-20 shadow-md">
                <div className="flex items-center gap-6">
                    <div className="size-8 text-primary">
                        <span className="material-symbols-outlined text-4xl">sports_cricket</span>
                    </div>
                    <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em]">Match 5: Strategy Phase</h2>
                </div>

                {/* Timer / Status */}
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-[#28392f]">
                    <span className="material-symbols-outlined text-amber-500">timer</span>
                    <span className="font-bold text-lg text-slate-700 dark:text-slate-200">02:45 remaining</span>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-primary" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCRN4MXDFxuglvT4gEX2epKDm2vKbPI2seNxMyGCe9Y80vsj1PP6XEvLLFoTfxICKHL9nXjn8fn_LX0SZzp9gZvRz27XLh5mApAvIwZ-FhyoRHIJawkmOP_98G91FgXH8U0cGlkv_xW8Yoc8UgJrzPxH0TkQkl-wAIrDJUJA-y21wyP3fvzh-DAPASwqBOJGbww71baOwxCqfmsREQ-YpDRvw3YQjWn37NHDWMHKyU0yAyFmUt1Vim5WZwd5_c7Cwo_hIEzlo1mezI')" }}></div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Manager</span>
                            <span className="font-bold text-lg">Rohan S.</span>
                        </div>
                    </div>
                    <button className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-primary hover:bg-green-400 transition-colors text-[#111814] text-lg font-extrabold leading-normal tracking-[0.015em] shadow-[0_0_15px_rgba(43,238,121,0.3)]">
                        <span className="truncate">LOCK SQUAD</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden p-6 gap-6 max-w-[1920px] mx-auto w-full">
                {/* Warning Banner */}
                <div className="w-full bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4 text-red-400">
                        <span className="material-symbols-outlined text-3xl">warning</span>
                        <span className="text-xl font-bold">Rule Violation: Lineup must include at least 1 Wicketkeeper.</span>
                    </div>
                    <button className="text-sm font-bold text-red-400 underline decoration-2 underline-offset-4 hover:text-red-300">Auto-fix</button>
                </div>

                {/* Section 1: Bench / Drafted Players */}
                <section className="flex flex-col gap-4 min-h-[340px]">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <h3 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                Drafted Squad <span className="text-xl font-medium text-slate-400 px-3 py-1 rounded-full bg-[#1a2c22] border border-[#28392f]">6 Available</span>
                            </h3>
                            <p className="text-slate-400 text-lg mt-1">Drag players from here to the slots below.</p>
                        </div>
                        {/* Filters */}
                        <div className="flex gap-2">
                            <button className="px-4 py-2 rounded-lg bg-[#1a2c22] border border-[#28392f] text-slate-300 font-bold hover:bg-primary hover:text-black transition-colors">Batters</button>
                            <button className="px-4 py-2 rounded-lg bg-[#1a2c22] border border-[#28392f] text-slate-300 font-bold hover:bg-primary hover:text-black transition-colors">Bowlers</button>
                            <button className="px-4 py-2 rounded-lg bg-[#1a2c22] border border-[#28392f] text-slate-300 font-bold hover:bg-primary hover:text-black transition-colors">All-Rounders</button>
                        </div>
                    </div>

                    {/* Scrollable Bench Container */}
                    <div className="flex gap-6 overflow-x-auto pb-6 px-2 custom-scrollbar">
                        <BenchPlayerCard name="Virat K." role="Batter" rating="95" stats="Avg: 50.4 • SR: 138" iconColor="text-primary" icon="sports_cricket" image="https://lh3.googleusercontent.com/aida-public/AB6AXuDC6l4ExAFtz4w44CIs5sCE0Ys6qYl0hc_WEuJTRTyircVWqr4SCAvRCEfvFpKYgnB4LwOYLvNuxLZmC2NB8P38bXLQD-Xlh-HQvBTr9gzPujyUyhX8TGwgwAzBpfr_UBBx7tqM5xzPY34bQ9KMRQ8K_LMO5MMaxvZipkjOdYm5Zka8jNmR21yl4HKOKJzYj5NXndskDGrAmqrVnGM0BH0bXACC3Cja3ZAVLB309EGuK8j4qwxvHrQ9ljk0U8RZzRD2HN4R4s0IOAs" />
                        <BenchPlayerCard name="Rohit S." role="Batter" rating="92" stats="Avg: 48.1 • SR: 142" iconColor="text-primary" icon="sports_cricket" image="https://lh3.googleusercontent.com/aida-public/AB6AXuChyQNIg0clrhSlcY40LG0bjswaiw2d1ArmkqPWHmdTiYMpq5pl59eQ1nz8uBfPc_fXml6alKVvYkG9N2LT-bEcfgStBzCPBBInMquTvhCSRldJaULIwxxb70ZhHZgUXHjpSFJ088V-jETIdynkDq4NmR9MGeDusfzgPaZOmwDsOl9khdOzNzoOmeMTmt-rPbduZ3jCBtnbNimHnj0OJ941iP2AP-INr6z5WOY6Tvg2VEAzMPWLXusVzZvXxqQlrgVpnz7j0qLcxYA" />
                        <BenchPlayerCard name="Jasprit B." role="Bowler" rating="94" stats="Econ: 6.8 • Wkts: 124" iconColor="text-blue-400" icon="sports_baseball" image="https://lh3.googleusercontent.com/aida-public/AB6AXuDOjzC93ieItTCMv5s8yXSfgaa7CIQYlQnI2zRQwKRJvRtYx3vobYC_yopqzc6LnnhqdqgAZCmBFxsjUrlKHtJi1SgDAGPWIYPnmSOhm8W59yKS0Wgevp8CYrdtaUeWO7R0E7R77UcYrXxLn9yIZ74Z8t9SbvpUowmhbDu-PaTW1jGZdHVutfbcuaJNXXh-joV2tyoUADM4Xg35kVYAVeDI_OgI9rZ76w3ZtuC8Mr7RZyhHrYE59OH2q6y3CsVwCnSY6tqlP2Dg7xY" />
                        <BenchPlayerCard name="Hardik P." role="All-Rounder" rating="89" stats="SR: 145 • Wkts: 45" iconColor="text-amber-400" icon="star" fading={true} image="https://lh3.googleusercontent.com/aida-public/AB6AXuDMDyafWR-bjEGEfkpsbxvvuCJUmYIZ2FJnvSOzpx2dNfSHkJ6SXHI8xCw0YAd_PAVd6ZLOp7puRg693JgQ1eVao4-M6Nn_54FsKbjPKTDyWkz6H_x4xcnVMo76-qN8J9NElYLdieB8TzSvA0mUtjLG120FFRyRBkJ2KY0KTf11ULj2STBzVYy8mh5Fupfsgnf5Q5gfseiGi3kyop16QMMu-vgGKoMfHG0ZbfSPSDYFoEWyqdXwJzzvww1CbGgT4VUg1CFGAMPepSw" />
                        <BenchPlayerCard name="MS Dhoni" role="Keeper" rating="88" stats="Catches: 150 • SR: 135" iconColor="text-purple-400" icon="sports_handball" image="https://lh3.googleusercontent.com/aida-public/AB6AXuA9XWQ-gEZv3iehOOpMAystuY9saOiG3qoAxBHGora-wl-MaRPgLdBoeRPK3iHG0NWtRVLwSBRmgTVtkSvyDK45sZNgDps6M1lng-Tty03gXhDXdBAQa21cIk4UWZeFheF1yEtATPL_BvCaZZpKXlgxfqxaLC-MqRwRcPWS4tpyxmHz-_ie2GlGQWtckqvWZRYtIrpldUOuQieYfz3GWtMOxT8uxGyB1jF-eoIvmjSQjtYdTdgtGYtV9gFCnjZEzvETKjUCNx82ET4" />
                    </div>
                </section>

                {/* Section 2: Lineup Slots (The Field) */}
                <section className="flex-1 flex flex-col bg-[#1a2c22]/30 rounded-3xl p-6 border border-[#28392f] shadow-inner relative">
                    <h3 className="text-3xl font-black text-white px-2 mb-6">Starting Lineup Slots</h3>
                    <div className="grid grid-cols-6 gap-6 h-full">

                        {/* Batter Slots (3) */}
                        <div className="col-span-3 flex flex-col gap-4">
                            <h4 className="text-primary/70 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined">sports_cricket</span> Batters (3)
                            </h4>
                            <div className="flex gap-4 h-full">
                                {/* Filled Slot */}
                                <div className="flex-1 bg-[#23392d] rounded-xl border border-primary/50 flex flex-col items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDTyCI09jWMGC9svQya4GkuL_9sWcormE84uNjwmhuRyLA4jIC5a8YinxndVCmNcNi1fZSXgk6oVz0ats7bm7QcNXrZAhSob-vACdb0pSv8BCUeYxAx_DFEtLdrPhicmIJS_UmUASzpUhx9cE0Diz0kK3vPTdsvIDFUUfl80I7uMzlVCfyrMbpT3T9HiSWwMkfqUgcRCv3N9oce0iYW5yZze62dKojD6i_YabscewthCptzNOReloNAH2800ZGjXF76QS8LuHnk1rM')" }}></div>
                                    <div className="z-10 flex flex-col items-center text-center">
                                        <div className="size-16 rounded-full bg-cover bg-center border-2 border-primary mb-2 shadow-lg" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDzaBODk71Fdult_9FPBQvczWslxSC8uytjzz0UZR15RASz5GA9nP9D_Zki4NUsLvP8RGoQ_AUx0FsMVB7Kd0uVWTs4GkxTAYFMK6EqXXkWVqiPmySXDUzeoGQYiYyXRG3G0FHqt9F0pRanOkdCCSSnCb4ePIOuQ5SetFkczuwKbAKmZl1uj9YH0RS3xIADw8DsTeeRPgSTi6ywYe6cpfUJsb3Utezt3CpJYQ6ouAk48i_x1vF36fBELd54ocB45neu4LDXbY47nMA')" }}></div>
                                        <span className="text-white font-bold text-lg">Virat K.</span>
                                        <span className="text-primary text-xs font-bold uppercase bg-primary/10 px-2 py-0.5 rounded mt-1">Batter</span>
                                    </div>
                                    <button className="absolute top-2 right-2 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                {/* Empty Slots */}
                                <EmptySlot />
                                <EmptySlot />
                            </div>
                        </div>

                        {/* Bowler Slots (2) */}
                        <div className="col-span-2 flex flex-col gap-4">
                            <h4 className="text-blue-400/70 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined">sports_baseball</span> Bowlers (2)
                            </h4>
                            <div className="flex gap-4 h-full">
                                <EmptySlot hoverBorder="hover:border-blue-400/50" />
                                <EmptySlot hoverBorder="hover:border-blue-400/50" />
                            </div>
                        </div>

                        {/* All-Rounder Slot (1) */}
                        <div className="col-span-1 flex flex-col gap-4">
                            <h4 className="text-amber-400/70 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined">star</span> All-Rounder (1)
                            </h4>
                            <div className="h-full">
                                {/* Active Drop Target State */}
                                <div className="h-full border-2 border-primary bg-primary/10 rounded-xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(43,238,121,0.15)] animate-pulse">
                                    <span className="material-symbols-outlined text-5xl text-primary mb-2">south</span>
                                    <span className="text-primary font-bold text-lg uppercase">Drop Here</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            </main>

            {/* Overlay Drag Element Simulation */}
            <div className="fixed top-[45%] left-[60%] w-64 pointer-events-none z-50 transform rotate-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="bg-[#1a2c22] rounded-2xl border-2 border-primary overflow-hidden">
                    <div className="absolute top-3 right-3 bg-primary text-[#102217] font-black text-lg px-2 py-1 rounded z-10">89</div>
                    <div className="h-48 w-full bg-cover bg-top" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAPM0QbL7p9yUAGzbqGohPLGrYmawHnBCwkduEjXD9FYavRLZI3EcRQgqEKKiehERgdD_B1YfIgsjwJZApAY6H_uV1srKL2Dbb0J5YNlUrF-QMXRuQgV3PvGUlSEaVW8OXQPFo8OjE4wO3jwjZnSu0hEyPGGmEvArqOh8sfBBw92_Isby5gZygIFxbkyWOxO1FJzzlppZXQ2d1ixmBVNcgZVHUtZfUliwdmTp6aAOec4n_cweusWOr2g5fjKZXcvs9bm-1b5eDuQIM')" }}></div>
                    <div className="p-4 bg-[#1a2c22]">
                        <h4 className="text-white text-2xl font-bold leading-tight">Hardik P.</h4>
                        <div className="flex items-center gap-2 mt-1 text-amber-400 text-sm font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-lg">star</span> All-Rounder
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BenchPlayerCard({ name, role, rating, stats, iconColor, icon, fading, image }: any) {
    return (
        <div className={`group relative flex-shrink-0 w-64 bg-[#1a2c22] rounded-2xl border border-[#28392f] overflow-hidden hover:border-primary hover:shadow-[0_0_20px_rgba(43,238,121,0.2)] transition-all cursor-grab active:cursor-grabbing ${fading ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#102217] opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-primary font-black text-lg border border-primary/30">{rating}</div>
            <div className="h-48 w-full bg-cover bg-top" style={{ backgroundImage: `url('${image}')` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a2c22] via-transparent to-transparent"></div>
            </div>
            <div className="p-4 relative -mt-6">
                <div className={`flex items-center gap-2 mb-1 ${iconColor} text-sm font-bold uppercase tracking-wider`}>
                    <span className="material-symbols-outlined text-lg">{icon}</span> {role}
                </div>
                <h4 className="text-white text-2xl font-bold leading-tight">{name}</h4>
                <p className="text-slate-400 text-sm mt-1">{stats}</p>
            </div>
        </div>
    );
}

function EmptySlot({ hoverBorder = "hover:border-primary/50" }: { hoverBorder?: string }) {
    return (
        <div className={`flex-1 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center bg-black/20 hover:bg-black/40 ${hoverBorder} transition-colors`}>
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">add</span>
            <span className="text-slate-500 font-bold text-sm uppercase">Empty Slot</span>
        </div>
    );
}
