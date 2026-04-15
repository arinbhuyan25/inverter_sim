"use client";

import React from 'react';
import Link from 'next/link';
<<<<<<< HEAD
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Activity,
    Bell,
    Settings,
    ShieldCheck,
    Zap,
    Cpu,
    Play
} from 'lucide-react';
import { useTelemetry } from '@/context/TelemetryContext';
=======
import { LayoutDashboard, Activity, Bell, Zap } from 'lucide-react';
>>>>>>> 2ceb9e656aba78b8b66c6214cfe268e5b987ff5f

export const Sidebar = () => {
    const pathname = usePathname();
    const { demoMode, setDemoMode } = useTelemetry();

    const navItems = [
        { label: 'Overview', icon: LayoutDashboard, href: '/' },
        { label: 'Diagnosis', icon: Activity, href: '/diagnosis' },
        { label: 'Alerts', icon: Bell, href: '/alerts' },
    ];

    return (
<<<<<<< HEAD
        <div className="fixed left-0 top-0 h-full w-64 glass border-r border-white/10 hidden md:flex flex-col p-6 z-50">
            <div className="flex items-center gap-3 mb-12 px-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Zap className="text-white" size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold font-mono tracking-tighter leading-none">LUMINOUS</h1>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Early Warning</span>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                }`}
                        >
                            <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
                            <span className="font-medium text-sm">{item.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
=======
        <aside className="fixed left-0 top-0 h-full w-20 md:w-64 glass border-r border-white/5 z-50 transition-all duration-300">
            {/* Subtle glow behind logo */}
            <div className="absolute top-0 left-0 w-full h-32 bg-primary/10 blur-3xl -z-10 pointer-events-none" />

            <div className="flex h-20 items-center gap-3 px-6 border-b border-white/5">
                <div className="bg-primary/20 p-2.5 rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                    <Zap size={24} className="text-primary glow-text" />
                </div>
                <span className="font-bold text-xl hidden md:block tracking-[0.2em] text-white glow-text">A.R.M.S</span>
            </div>

            <nav className="mt-8 px-4 space-y-3">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300 text-muted-foreground hover:text-white group relative overflow-hidden"
                    >
                        {/* Hover glow effect background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="group-hover:text-primary transition-colors z-10">
                            {item.icon}
                        </div>
                        <span className="font-medium hidden md:block tracking-wide z-10">{item.label}</span>
                    </Link>
                ))}
>>>>>>> 2ceb9e656aba78b8b66c6214cfe268e5b987ff5f
            </nav>

            {/* Simulation Toggle - The "Pro" Presentation Tool */}
            <div className="mt-auto pt-6 border-t border-white/5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Cpu size={14} className={demoMode ? 'text-health-green' : 'text-muted-foreground'} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Demo Simulation</span>
                        </div>
                        {/* Simple Toggle Switch */}
                        <button
                            onClick={() => setDemoMode(!demoMode)}
                            className={`w-8 h-4 rounded-full relative transition-colors ${demoMode ? 'bg-health-green' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${demoMode ? 'left-4.5' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        Enable high-frequency autonomous data for presentation in low-signal environments.
                    </p>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-1 px-2">
                <div className="flex items-center gap-2 text-health-green">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Logic Secure</span>
                </div>
            </div>
        </div>
    );
};
