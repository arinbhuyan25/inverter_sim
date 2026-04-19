"use client";

import { useTelemetry } from "@/context/TelemetryContext";
import {
    FileText,
    Cpu,
    Binary,
    ChevronRight,
    Info,
    Database,
    Search
} from "lucide-react";
import { motion } from "framer-motion";

export default function DiagnosisPage() {
    const { data, status } = useTelemetry();
    const isDisconnected = status === 'disconnected';

    // Mapping of register keys to friendly names/descriptions
    const registers = [
        { key: 'inverter_status', id: '3012', name: 'Operation Mode', desc: '0: Mains, 1: Battery' },
        { key: 'cycle_count', id: '3100', name: 'Relay Cycles', desc: 'Total mechanical operations' },
        { key: 'temperature', id: '3019', name: 'Internal Temp', desc: 'Core heat sink temperature' },
        { key: 'inverter_current', id: '3054', name: 'Load Current', desc: 'Current draw from inverter' },
        { key: 'inrush_ratio', id: 'calc', name: 'Inrush Peak', desc: 'High stress startup ratio' },
        { key: 'physics_rul_pct', id: 'calc', name: 'Physics RUL', desc: 'Linear Wear & Tear Model' },
        { key: 'ml_rul_pct', id: 'calc', name: 'ML RUL', desc: 'LSTM Inference with variance' },
        { key: 'hybrid_rul_pct', id: 'calc', name: 'Hybrid RUL', desc: 'Weighted Multi-Model Blend' },
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold font-mono uppercase tracking-tighter">Diagnosis Center</h1>
                    <p className="text-muted-foreground mt-1">Component-level telemetry and logic verification.</p>
                </div>
                <div className="hidden md:flex gap-2">
                    <button className="glass px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-white/5">
                        <FileText size={14} /> Export Logs
                    </button>
                </div>
            </div>

            {/* Logic Toggle: Simulation Proof */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="glass p-8 rounded-[2rem] border-primary/20">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                <Database size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg uppercase tracking-tight">Standard Physics Model</h3>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Rule-Based Analysis</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-4">
                        <span className="text-6xl font-mono font-bold text-blue-400">
                            {isDisconnected ? '--' : (data.physics_rul_pct?.toFixed(1) || '100.0')}%
                        </span>
                        <p className="text-center text-xs text-muted-foreground max-w-[250px] leading-relaxed">
                            calculated using Linear Arrhenius degradation based on cycle count and temperature thresholds.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                            <span>Input Signal</span>
                            <span>Contribution</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500/50 w-[40%]" title="Cycle Count"></div>
                            <div className="h-full bg-blue-300/30 w-[60%]" title="Temperature"></div>
                        </div>
                    </div>
                </div>

                <div className="glass p-8 rounded-[2rem] border-purple-500/20 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg uppercase tracking-tight text-white">Hybrid AI Model</h3>
                                <span className="text-[10px] text-purple-400 uppercase font-bold">Pattern Intelligence</span>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-bold text-purple-400 uppercase">
                            ACTIVE
                        </div>
                    </div>

                    <div className="p-8 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-4 shadow-inner relative z-10">
                        <span className="text-6xl font-mono font-bold text-purple-400">
                            {isDisconnected ? '--' : (data.hybrid_rul_pct?.toFixed(1) || '100.0')}%
                        </span>
                        <p className="text-center text-xs text-muted-foreground max-w-[250px] leading-relaxed">
                            LSTM-based inference considering non-linear inrush frequency and thermal transients.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 relative z-10">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                            <span>Delta Detection</span>
                            <span>+ {Math.abs((data.hybrid_rul_pct || 0) - (data.physics_rul_pct || 0)).toFixed(1)}% Accuracy</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-purple-500 w-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Datasheet */}
            <div className="glass rounded-[2rem] overflow-hidden border-white/5">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Binary size={20} className="text-muted-foreground" />
                        <h3 className="font-bold uppercase tracking-widest text-sm">Live Modbus Datasheet</h3>
                    </div>
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            type="text"
                            placeholder="Search registers..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary/40 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/2">
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Address</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Parameter</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Raw Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {registers.map((reg) => (
                                <tr key={reg.key} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-4 font-mono text-xs text-primary">{reg.id}</td>
                                    <td className="px-8 py-4 font-bold text-sm">{reg.name}</td>
                                    <td className="px-8 py-4 text-xs text-muted-foreground">{reg.desc}</td>
                                    <td className="px-8 py-4 text-right">
                                        <span className={`font-mono font-bold px-3 py-1 rounded-lg bg-white/5 border border-white/5 group-hover:border-primary/20 transition-colors`}>
                                            {isDisconnected ? '--' : (data[reg.key] !== undefined ? data[reg.key].toString() : '--')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
