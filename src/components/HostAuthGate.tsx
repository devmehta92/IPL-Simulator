'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface HostAuthGateProps {
    sessionId: string;
    children: React.ReactNode;
}

export default function HostAuthGate({ sessionId, children }: HostAuthGateProps) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // 1. Check local storage for an existing valid token for this specific session
            const savedPin = localStorage.getItem(`host_pin_${sessionId}`);

            if (savedPin) {
                // Verify the saved PIN against the database
                const { data } = await supabase
                    .from('league_sessions')
                    .select('host_pin')
                    .eq('id', sessionId)
                    .single();

                if (data && data.host_pin === savedPin) {
                    setIsAuthorized(true);
                    setIsChecking(false);
                    return;
                } else {
                    // Invalid or expired local pin, clear it
                    localStorage.removeItem(`host_pin_${sessionId}`);
                }
            }

            setIsAuthorized(false);
            setIsChecking(false);
        };

        checkAuth();
    }, [sessionId]);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsChecking(true);

        try {
            const { data } = await supabase
                .from('league_sessions')
                .select('host_pin')
                .eq('id', sessionId)
                .single();

            if (data && data.host_pin === pinInput.trim()) {
                // Success! Save to local storage and unlock
                localStorage.setItem(`host_pin_${sessionId}`, pinInput.trim());
                setIsAuthorized(true);
            } else {
                setError('Incorrect Host PIN.');
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setError('Error verifying PIN.');
        } finally {
            setIsChecking(false);
        }
    };

    // Show a blank loading state while initially checking localStorage
    if (isChecking && isAuthorized === null) {
        return <div className="min-h-screen bg-[#0a1410] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;
    }

    // If authorized, render the protected children visually (the Host Dashboard)
    if (isAuthorized) {
        return <>{children}</>;
    }

    // If NOT authorized, render the massive PIN Lockout screen
    return (
        <div className="fixed inset-0 z-[9999] bg-[#0a1410]/95 backdrop-blur-xl flex items-center justify-center p-4 font-display">
            <div className="bg-surface-dark border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <span className="material-symbols-outlined text-4xl">lock</span>
                </div>

                <h2 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">Host Access Only</h2>
                <p className="text-slate-400 text-sm text-center mb-8">This view controls the live game state. Enter the 4-digit Host PIN to unlock.</p>

                <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-4">
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-4 text-center text-4xl tracking-[1em] text-white focus:outline-none focus:border-primary transition-colors"
                        autoFocus
                        required
                    />

                    {error && <p className="text-red-400 text-sm text-center font-medium animate-pulse">{error}</p>}

                    <button
                        type="submit"
                        disabled={isChecking || pinInput.length < 4}
                        className="w-full h-14 mt-4 bg-primary hover:bg-emerald-400 text-background-dark font-black text-lg uppercase tracking-wide rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isChecking ? <div className="w-5 h-5 rounded-full border-2 border-background-dark border-t-transparent animate-spin"></div> : 'Unlock'}
                    </button>
                </form>

                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-6 text-sm text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-bold"
                >
                    Return to Lobby
                </button>
            </div>
        </div>
    );
}
