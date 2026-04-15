"use client";

import { useTelemetry } from '@/context/TelemetryContext';
import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';

export const TopBar = () => {
    const { status, lastUpdated } = useTelemetry();

    return (
        <header className="h-20 glass border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-40">
            <div>
                <h2 className="text-primary text-xs font-bold uppercase tracking-[0.3em] opacity-80 glow-text drop-shadow-md">System Status</h2>
                <p className="text-xl font-bold font-mono tracking-wider">EARLY WARNING DASHBOARD</p>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        {status === 'connected' && (
                            <div className="flex items-center gap-2 text-health-green glow-text shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-health-green opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-health-green shadow-[0_0_8px_#10b981]"></span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest">Live</span>
                            </div>
                        )}
                        {status === 'syncing' && (
                            <div className="flex items-center gap-2 text-primary animate-pulse glow-text">
                                <RefreshCcw size={14} className="animate-spin" />
                                <span className="text-xs font-bold uppercase tracking-widest">Syncing...</span>
                            </div>
                        )}
                        {status === 'disconnected' && (
                            <div className="flex items-center gap-2 text-health-red glow-text">
                                <WifiOff size={14} />
                                <span className="text-xs font-bold uppercase tracking-widest">Offline</span>
                            </div>
                        )}
                    </div>
                    {lastUpdated && (
                        <span className="text-[10px] text-primary/60 mt-1 uppercase tracking-widest font-medium">
                            Last update: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
        </header>
    );
};
