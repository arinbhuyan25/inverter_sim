"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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

export const Sidebar = () => {
    const pathname = usePathname();
    const { demoMode, setDemoMode } = useTelemetry();

    const navItems = [
        { label: 'Overview', icon: LayoutDashboard, href: '/' },
        { label: 'Diagnosis', icon: Activity, href: '/diagnosis' },
        { label: 'Alerts', icon: Bell, href: '/alerts' },
    ];

    return (
        <div className="fixed left-0 top-0 h-full w-64 glass border-r border-white/10 hidden md:flex flex-col p-6 z-50">
            <div className="flex items-center gap-3 mb-12 px-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Zap className="text-white" size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold font-mono tracking-tighter leading-none">ARMS</h1>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Inverter Security Service</span>
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
            </nav>

            {/* Simulation Toggle - The "Pro" Presentation Tool */}
            <div className="mt-auto pt-6 border-t border-white/5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Cpu size={14} className={demoMode ? 'text-health-green' : 'text-muted-foreground'} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Demo Simulation</span>
                        </div>
                        {/* Framer-Motion Toggle Switch */}
                        <button
                            onClick={() => setDemoMode(!demoMode)}
                            className={`w-10 h-6 rounded-full relative transition-colors duration-300 flex items-center px-1 ${demoMode ? 'bg-health-green' : 'bg-slate-700'}`}
                        >
                            <motion.div
                                layout
                                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                style={{ x: demoMode ? 16 : 0 }}
                            />
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
