"use client";

import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ReactElement;
    trend?: string;
    status?: 'normal' | 'warning' | 'critical';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon, trend, status = 'normal' }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'critical': return 'text-health-red border-health-red/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
            case 'warning': return 'text-health-yellow border-health-yellow/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
            default: return 'text-primary border-white/5';
        }
    };

    const getIconTheme = () => {
        switch (status) {
            case 'critical': return 'bg-health-red/10 text-health-red shadow-[0_0_10px_rgba(239,68,68,0.5)]';
            case 'warning': return 'bg-health-yellow/10 text-health-yellow shadow-[0_0_10px_rgba(245,158,11,0.5)]';
            default: return 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(14,165,233,0.5)]';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className={`glass glass-hover p-6 rounded-3xl flex flex-col justify-between border ${getStatusColor()} relative overflow-hidden`}
        >
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div className="flex items-center justify-between z-10 relative">
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-[0.2em]">{title}</span>
                <div className={`p-2.5 rounded-xl ${getIconTheme()}`}>
                    {icon}
                </div>
            </div>

            <div className="mt-8 flex items-baseline gap-1 z-10 relative">
                <span className={`text-4xl font-bold tracking-tighter ${status === 'normal' ? 'glow-text text-white' : ''}`}>
                    {value}
                </span>
                {unit && <span className="text-muted-foreground text-sm font-medium ml-1">{unit}</span>}
            </div>

            {trend && (
                <div className="mt-3 flex items-center gap-2 z-10 relative">
                    <span className="text-[11px] text-muted-foreground/80 font-medium tracking-wide uppercase">{trend}</span>
                </div>
            )}
        </motion.div>
    );
};
