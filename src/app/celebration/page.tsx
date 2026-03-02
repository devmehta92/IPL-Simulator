import React from 'react';
import Image from 'next/image';

export default function CelebrationPage() {
    return (
        <div className="bg-background-dark text-slate-100 min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-display selection:bg-primary selection:text-background-dark">

            {/* Dynamic Background / Confetti Simulation layers */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center animate-pulse-slow opacity-60 mix-blend-screen"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop')" }}
            ></div>
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-blue-900/40 via-background-dark/80 to-background-dark pointer-events-none"></div>

            {/* Gold Particles / Lights overlay */}
            <div className="absolute inset-0 z-10 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(234, 179, 8, 0.4) 0%, transparent 40%)' }}></div>

            <main className="relative z-20 flex flex-col items-center justify-center text-center max-w-5xl px-6 w-full animate-fade-in-up">
                {/* Championship Header */}
                <div className="mb-4 text-yellow-500 font-bold tracking-[0.3em] uppercase text-sm md:text-lg animate-bounce">
                    <span className="material-symbols-outlined align-middle mr-2">stars</span>
                    PCL 2024 Champions
                    <span className="material-symbols-outlined align-middle ml-2">stars</span>
                </div>

                {/* Huge Team Logo / Trophy Area */}
                <div className="relative mb-12 mt-8 group cursor-default">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[100px] group-hover:bg-blue-400/40 transition-colors duration-1000"></div>
                    <div className="absolute inset-0 ring-4 ring-yellow-500/20 rounded-full animate-ping-slow mix-blend-overlay"></div>

                    <div className="relative size-64 md:size-80 rounded-full border-4 border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.5)] bg-gradient-to-br from-[#0c1a2e] to-[#040e1c] flex items-center justify-center overflow-hidden z-20 transform transition-transform duration-700 hover:scale-105">
                        <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>
                        <Image
                            alt="Mumbai Indians Logo"
                            className="object-contain filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] !p-6"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBS5QyVWoer10zskGjpJmNBYZE2yOQWeHWbjadxTKbfsNmpI9erOtrQHfjUbqFgnvEeakTaRLEHWrhgmZ1gF0lgVeXGocnUhNw0RetsWXXAcb5b4Go6ihacw830MxitKAXf34tnxvVmAQXEWhnfbctKu1vQx_TjVNhd0MeuDH8R6Ec_11r5H-XyiqOgKcM0Uf8S_HUoK5eGq9VM2loqXzSmVJe8x8h8wWbp1F6CFgaq2MoQADk7PMtZCp2L59S0sEf75oS-aik2IN0"
                            fill
                            sizes="(max-width: 768px) 16rem, 20rem"
                            unoptimized
                        />
                    </div>

                    {/* Trophy Icon Overlay */}
                    <div className="absolute -bottom-8 -right-8 size-32 bg-yellow-500 rounded-full flex items-center justify-center border-4 border-background-dark shadow-2xl z-30 transform -rotate-12 animate-wiggle">
                        <span className="material-symbols-outlined text-[80px] text-background-dark">emoji_events</span>
                    </div>
                </div>

                {/* Title Text */}
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-blue-400 tracking-tighter uppercase drop-shadow-[0_5px_15px_rgba(59,130,246,0.6)] leading-none mb-6">
                    Mumbai<br />Indians
                </h1>

                <div className="h-px w-3/4 max-w-md bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent my-6"></div>

                {/* Manager/Owner info */}
                <div className="flex flex-col items-center gap-2 mb-12">
                    <p className="text-slate-400 text-lg uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500 text-base">military_tech</span>
                        Winning Manager
                    </p>
                    <p className="text-3xl font-bold text-white">Aditya M.</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 mt-4 w-full justify-center">
                    <button className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-2xl">leaderboard</span>
                        View Final Standings
                    </button>
                    <button className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xl rounded-xl transition-all flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-2xl">replay</span>
                        Return to Lobby
                    </button>
                </div>
            </main>

            {/* Decorative fireworks/confetti placeholder for user's imagination */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {/* This would be handled by a confetti library like react-confetti in a real implementation */}
                <div className="absolute top-[-10%] left-[20%] size-4 bg-blue-500 rounded-sm transform rotate-45 animate-[fall_3s_linear_infinite]"></div>
                <div className="absolute top-[-10%] left-[60%] size-3 bg-yellow-400 rounded-full animate-[fall_4s_linear_infinite_0.5s]"></div>
                <div className="absolute top-[-10%] left-[80%] size-5 bg-white rounded-sm transform rotate-12 animate-[fall_5s_linear_infinite_1s]"></div>
                <div className="absolute top-[-10%] left-[40%] size-3 bg-blue-300 rounded-full animate-[fall_3.5s_linear_infinite_1.5s]"></div>
                <div className="absolute top-[-10%] left-[10%] size-4 bg-yellow-500 rounded-sm transform -rotate-45 animate-[fall_4.5s_linear_infinite_0.2s]"></div>
            </div>
        </div>
    );
}
