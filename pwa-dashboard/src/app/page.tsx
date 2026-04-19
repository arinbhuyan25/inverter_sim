"use client";

import { useTelemetry } from "@/context/TelemetryContext";
import { RulGauge } from "@/components/gauges/RulGauge";
import { StatCard } from "@/components/ui/StatCard";
import {
  Thermometer,
  RotateCw,
  Zap,
  AlertTriangle,
  Power,
  Flame,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { data, status, lastUpdated, simulateStress } = useTelemetry();

  const isDisconnected = status === 'disconnected';
  const isSyncing = status === 'syncing';

  // Safe numeric cast — ThingsBoard sends values as strings over WebSocket
  const toNum = (val: any): number => Number(val) || 0;

  const getSeverity = (val: any, warning: number, critical: number) => {
    const n = toNum(val);
    if (!n) return 'normal';
    if (n >= critical) return 'critical';
    if (n >= warning) return 'warning';
    return 'normal';
  };

  return (
    <div className="space-y-8 pb-14 relative z-10">
      {/* Background ambient light effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 animate-float pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10 animate-pulse-glow pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-sans uppercase tracking-tighter text-white glow-text">System Core</h1>
          <p className="text-muted-foreground mt-2 font-medium tracking-wide">Command Center Node {process.env.NEXT_PUBLIC_DEVICE_ID || 'INV-001'}</p>
        </div>

        <div className="flex gap-4">
          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`p-2.5 rounded-xl ${status === 'connected' ? 'bg-health-green/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : status === 'demo' ? 'bg-accent/20 shadow-[0_0_15px_rgba(255,123,0,0.3)]' : 'bg-health-red/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
              <Activity size={20} className={status === 'connected' ? 'text-health-green' : status === 'demo' ? 'text-accent' : 'text-health-red'} />
            </div>
            <div className="z-10 relative">
              <span className="text-[10px] text-muted-foreground/80 uppercase font-bold tracking-[0.2em] block mb-0.5">Link Status</span>
              <span className="font-bold tracking-wider text-sm glow-text uppercase">{status}</span>
            </div>
          </div>

          <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`p-2.5 rounded-xl ${data.inverter_status === 1 ? 'bg-health-green/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-primary/20 shadow-[0_0_15px_rgba(14,165,233,0.3)]'}`}>
              <Power size={20} className={data.inverter_status === 1 ? 'text-health-green' : 'text-primary'} />
            </div>
            <div className="z-10 relative">
              <span className="text-[10px] text-muted-foreground/80 uppercase font-bold tracking-[0.2em] block mb-0.5">Input Source</span>
              <span className="font-bold tracking-wider text-sm glow-text">{isDisconnected ? '--' : (data.inverter_status === 1 ? 'BATTERY' : 'MAINS CABLE')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Top Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Main Gauge Card */}
        <div className="xl:col-span-5 glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden group border-white/5 shadow-none pb-12">
          <div className="absolute top-8 left-8 z-10 w-full flex items-start gap-3">
            <Activity className="text-primary mt-0.5" size={18} />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Predictive Health</span>
              <h3 className="text-lg font-medium text-white">Remaining Useful Life</h3>
            </div>
          </div>

          <div className="mt-8">
            <RulGauge value={isDisconnected ? 0 : (data.hybrid_rul_pct !== undefined ? toNum(data.hybrid_rul_pct) : 100)} size={280} />
          </div>

          <div className="absolute bottom-6 left-12 right-12 flex justify-between px-2 py-4 bg-transparent z-10">
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.3em]">Physics RUL</span>
              <span className="text-xl font-mono font-bold text-[#38bdf8] tracking-widest">{isDisconnected ? '--' : (toNum(data.physics_rul_pct).toFixed(1) || '100.0') + '%'}</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.3em]">ML Confidence</span>
              <span className="text-xl font-mono font-bold text-[#38bdf8] tracking-widest">{isDisconnected ? '--' : '98.4%'}</span>
            </div>
          </div>
        </div>

        {/* 4 Analytics Panels top right */}
        <div className="xl:col-span-7 flex flex-col justify-between h-[500px]">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/50 border-white/5 pb-2 pl-2">Vitals Telemetry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 mt-2">
            <StatCard
              title="Avg Temperature"
              value={!isDisconnected && data.temperature ? toNum(data.temperature).toFixed(1) : '--'}
              unit="°C"
              icon={<Thermometer size={20} />}
              status={isDisconnected ? 'normal' : getSeverity(data.temperature, 65, 80)}
              trend="Ambient stress indicator"
            />
            <StatCard
              title="Cycle Count"
              value={!isDisconnected && data.cycle_count ? toNum(data.cycle_count) : '--'}
              icon={<RotateCw size={20} />}
              trend="Mechanical relay wear"
            />
            <StatCard
              title="Switch Frequency"
              value={!isDisconnected && data.switching_frequency ? toNum(data.switching_frequency).toFixed(1) : '--'}
              unit="/hr"
              icon={<Activity size={20} />}
              status={isDisconnected ? 'normal' : getSeverity(data.switching_frequency, 5, 10)}
              trend="Degradation multiplier"
            />
            <StatCard
              title="Inrush Ratio"
              value={!isDisconnected && data.inrush_ratio ? toNum(data.inrush_ratio).toFixed(1) : '--'}
              unit="%"
              icon={<Zap size={20} />}
              status={isDisconnected ? 'normal' : getSeverity(data.inrush_ratio, 1.5, 2.5)}
              trend="High current stress"
            />
          </div>
        </div>

      </div>

      {/* Bottom Section (Override Logs & Neural Interface) */}
      <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/50 border-white/5 pb-2 pt-4 pl-2">System Controls</h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Stress Simulator Controls */}
        <div className="lg:col-span-8 glass p-8 rounded-[2.5rem] border-accent/20 bg-gradient-to-r from-[#0A1324]/80 to-[#1A0E08]/80 flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden group shadow-[0_0_20px_rgba(255,123,0,0.05)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -z-10 pointer-events-none group-hover:bg-accent/20 transition-all duration-700" />

          <div className="flex-1 pr-8">
            <div className="flex items-center gap-3 mb-4 z-10 relative">
              <div className="p-2 gap-2 bg-accent/20 rounded-lg shadow-[0_0_10px_rgba(255,123,0,0.3)]">
                <Flame className="text-accent glow-text" size={20} />
              </div>
              <h3 className="font-bold text-xl uppercase tracking-[0.2em] text-white glow-text">Override Logs</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 md:mb-0 leading-relaxed tracking-wide font-medium">
              Force simulation parameters to bypass standard operational constraints and manually test edge-case anomalies. Use with caution.
            </p>
            <div className="hidden md:flex mt-6 p-4 rounded-xl bg-black/60 border border-health-red/20 text-xs text-health-red/80 font-medium tracking-wide items-start gap-3 backdrop-blur-md">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Direct execution via secure MQTT RPC channel. Anomalies map to core physical models.</span>
            </div>
          </div>

          <div className="space-y-4 relative z-10 md:min-w-[250px]">
            <button
              onClick={() => simulateStress('temp')}
              className="w-full py-5 rounded-xl bg-gradient-to-r from-accent to-[#ff4500] text-white font-bold text-sm uppercase tracking-[0.2em] hover:shadow-[0_0_25px_rgba(255,123,0,0.6)] transition-all duration-300 flex items-center justify-center gap-3 group/btn overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              <Thermometer size={18} className="group-hover/btn:scale-125 transition-transform duration-300" />
              <span className="z-10 drop-shadow-md">Engage Heat Load</span>
            </button>

            <button
              onClick={() => simulateStress('inrush')}
              className="w-full py-5 rounded-xl glass border-primary/30 text-primary font-bold text-sm uppercase tracking-[0.2em] hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all duration-300 flex items-center justify-center gap-3 group/btn hover:text-white"
            >
              <Zap size={18} className="group-hover/btn:scale-125 group-hover/btn:text-white transition-all duration-300" />
              Trigger Peak Inrush
            </button>
          </div>

          <div className="md:hidden mt-6 p-4 rounded-xl bg-black/60 border border-health-red/20 text-xs text-health-red/80 font-medium tracking-wide flex items-start gap-3 backdrop-blur-md">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>Direct execution via secure MQTT RPC channel. Anomalies map to core physical models.</span>
          </div>
        </div>

        {/* Neural Interface Node Details */}
        <div className="lg:col-span-4 glass p-8 rounded-[2.5rem] relative overflow-hidden h-full flex flex-col justify-center border-white/5 shadow-none group">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/80 mb-8 relative z-10">Neural Interface</h3>
          <div className="space-y-6 relative z-10 w-full">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 w-full">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Edge Ping latency</span>
              <span className="text-lg font-mono text-health-green font-bold">4ms</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Engine Model</span>
              <span className="text-lg font-mono text-primary font-bold">v2.4-QA</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
