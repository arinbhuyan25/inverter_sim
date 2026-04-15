"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface RulGaugeProps {
    value: number; // 0 to 100
    size?: number;
    label?: string;
}

export const RulGauge: React.FC<RulGaugeProps> = ({ value = 0, size = 280, label = "Hybrid RUL" }) => {
    const radius = size * 0.42;
    const strokeWidth = size * 0.08; // Thicker line
    const normalizedValue = Math.min(Math.max(value, 0), 100);
    const circumference = 2 * Math.PI * radius;
    // 270 degree arc = 75% of circumference
    const arcLength = circumference * 0.75;
    const strokeDasharray = `${arcLength} ${circumference}`;

    // Determine color based on banding
    const getColor = (val: number) => {
        if (val <= 20) return '#ef4444'; // Red
        if (val <= 40) return '#f59e0b'; // Amber
        return '#38bdf8'; // Matches primary brand blue
    };

    const currentColor = getColor(normalizedValue);

    return (
        <div className="relative flex flex-col items-center justify-center p-4" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform rotate-[135deg]"
            >
                {/* Clean Background Track Arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                />

                {/* Clean Progress Arc */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={currentColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    initial={{ strokeDashoffset: arcLength }}
                    animate={{ strokeDashoffset: arcLength * (1 - normalizedValue / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                />
            </svg>

            {/* Central Content */}
            <div className="absolute flex flex-col items-center justify-center -mt-6">
                <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-[2.75rem] font-bold font-mono tracking-tighter"
                    style={{ color: currentColor }}
                >
                    {normalizedValue.toFixed(1)}<span className="text-xl font-medium tracking-normal items-baseline ml-1 opacity-70">%</span>
                </motion.span>
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-[0.3em] mt-2">
                    {label}
                </span>
            </div>
        </div>
    );
};
