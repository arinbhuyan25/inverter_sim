"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

export const MapView: React.FC = () => {
    return (
        <div className="relative w-full h-[300px] rounded-3xl overflow-hidden glass border-white/5 flex items-center justify-center">
            {/* Dark stylized SVG logic/mockup for map */}
            <svg
                width="100%"
                height="100%"
                className="absolute inset-0 opacity-20 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Abstract Topographic Lines / Grid */}
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#gridPattern)" />
                <path d="M 0 150 Q 150 50 300 200 T 600 150" fill="none" stroke="rgba(14, 165, 233, 0.4)" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" />
            </svg>

            {/* Glowing nodes overlay */}
            <div className="absolute inset-0 z-10 w-full h-full">
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="absolute top-[40%] left-[30%] flex flex-col items-center"
                >
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-health-green/40 rounded-full blur-xl scale-150 animate-pulse group-hover:scale-200 transition-transform" />
                        <MapPin size={24} className="text-health-green drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] z-10 relative" />
                    </div>
                    <span className="mt-2 text-[10px] font-bold tracking-widest text-white/70 bg-black/50 px-2 py-0.5 rounded backdrop-blur-md border border-white/10 glow-text">INV-A1</span>
                </motion.div>

                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, type: 'spring' }}
                    className="absolute top-[60%] left-[60%] flex flex-col items-center"
                >
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-accent/40 rounded-full blur-xl scale-150 animate-pulse-glow group-hover:scale-200 transition-transform" />
                        <MapPin size={24} className="text-accent drop-shadow-[0_0_10px_rgba(255,123,0,0.8)] z-10 relative" />
                    </div>
                    <span className="mt-2 text-[10px] font-bold tracking-widest text-white/70 bg-black/50 px-2 py-0.5 rounded backdrop-blur-md border border-white/10 glow-text">INV-B4</span>
                </motion.div>
                
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.1, type: 'spring' }}
                    className="absolute top-[30%] left-[70%] flex flex-col items-center"
                >
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-primary/40 rounded-full blur-xl scale-150 animate-pulse group-hover:scale-200 transition-transform" />
                        <MapPin size={24} className="text-primary drop-shadow-[0_0_10px_rgba(14,165,233,0.8)] z-10 relative" />
                    </div>
                    <span className="mt-2 text-[10px] font-bold tracking-widest text-white/70 bg-black/50 px-2 py-0.5 rounded backdrop-blur-md border border-white/10 glow-text">INV-C2</span>
                </motion.div>
            </div>
        </div>
    );
};
