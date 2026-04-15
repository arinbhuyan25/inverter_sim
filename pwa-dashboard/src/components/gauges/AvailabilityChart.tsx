"use client";

import React from 'react';
import { motion } from 'framer-motion';

export const AvailabilityChart: React.FC = () => {
    // Mockup data for translucent bar chart
    const data = [
        { label: 'MON', value: 98 },
        { label: 'TUE', value: 99 },
        { label: 'WED', value: 95 },
        { label: 'THU', value: 100 },
        { label: 'FRI', value: 99 },
        { label: 'SAT', value: 97 },
        { label: 'SUN', value: 98 },
    ];

    return (
        <div className="flex flex-col h-full w-full justify-end pt-8">
            <div className="flex items-end justify-between h-48 gap-3 relative z-10 w-full">
                {data.map((day, i) => (
                    <div key={day.label} className="flex flex-col items-center flex-1 group">
                        {/* The Bar */}
                        <div className="relative w-full max-w-12 flex justify-center h-full items-end">
                            {/* Glow behind the bar */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${day.value}%` }}
                                transition={{ duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
                                className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-primary/10 to-primary/60 shadow-[0_0_15px_rgba(14,165,233,0.5)] opacity-80 group-hover:opacity-100 group-hover:from-primary/20 group-hover:to-primary/80 transition-all duration-300"
                            />
                            
                            {/* Inner core light */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${day.value}%` }}
                                transition={{ duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
                                className="absolute bottom-0 w-1/3 rounded-t-lg bg-primary opacity-50 blur-sm"
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-4 font-bold tracking-widest group-hover:text-primary transition-colors">
                            {day.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">
                            {day.value}%
                        </span>
                    </div>
                ))}
            </div>
            
            {/* Grid line */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-2" />
        </div>
    );
};
