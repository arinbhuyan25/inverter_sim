"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface TelemetryData {
    cycle_count?: number;
    inverter_current?: number;
    temperature?: number;
    switching_frequency?: number;
    inrush_ratio?: number;
    physics_health_index?: number;
    ml_rul_pct?: number;
    physics_rul_pct?: number;
    hybrid_rul_pct?: number;
    alert_level?: string;
    inverter_status?: number;
    local_ts?: number;
    ts?: number;
    [key: string]: any;
}

interface TelemetryContextType {
    data: TelemetryData;
    status: 'connected' | 'disconnected' | 'syncing' | 'demo';
    lastUpdated: Date | null;
    history: TelemetryData[];
    demoMode: boolean;
    setDemoMode: (val: boolean) => void;
    simulateStress: (type: 'temp' | 'inrush') => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Start with empty state for real-mode, will be filled by localStorage or WebSocket
    const [data, setData] = useState<TelemetryData>({});
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'demo'>('disconnected');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [history, setHistory] = useState<TelemetryData[]>([]);
    const [demoMode, setDemoMode] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const lastRecvTime = useRef<number>(Date.now());

    const ws = useRef<WebSocket | null>(null);

    // Fetch demo config on mount
    useEffect(() => {
        fetch('/demo_config.json')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error("Failed to load demo config", err));
    }, []);

    // Initial load: Only load from localStorage if we are in demo mode. If real mode, wait for ws
    useEffect(() => {
        if (demoMode) {
            const saved = localStorage.getItem('last_telemetry');
            if (saved) {
                const parsed = JSON.parse(saved);
                setData(parsed);
                setLastUpdated(new Date(parsed.local_ts || Date.now()));
            }
        }
    }, [demoMode]);

    // WebSocket Management
    useEffect(() => {
        if (demoMode) {
            setStatus('demo');
            if (ws.current) ws.current.close();
            // FIX 3: Hard clear so no live data bleeds into demo mode
            // FIX 3: Hard clear with Config defaults
            if (config) {
                setData({
                    ...config.initial,
                    inverter_status: 1,
                    local_ts: Date.now()
                });
            } else {
                setData({
                    cycle_count: 5020,
                    temperature: 42.5,
                    inverter_current: 18.2,
                    switching_frequency: 3.2,
                    inrush_ratio: 0.82,
                    hybrid_rul_pct: 82.4,
                    physics_rul_pct: 85.1,
                    inverter_status: 1,
                    local_ts: Date.now()
                });
            }
            // FIX 3: Always hard-clear when switching to live mode
            setData({});
            lastRecvTime.current = Date.now(); // reset timer so timeout doesn't fire immediately

            const connect = () => {
                const host = process.env.NEXT_PUBLIC_TB_HOST || 'eu.thingsboard.cloud';
                const token = process.env.NEXT_PUBLIC_TB_TOKEN;

                if (!token) return;

                setStatus('syncing');
                const protocol = (host.includes('thingsboard.cloud') || (typeof window !== 'undefined' && window.location.protocol === 'https:')) ? 'wss' : 'ws';
                const url = `${protocol}://${host}/api/ws/plugins/telemetry?token=${token}`;

                try {
                    const socket = new WebSocket(url);
                    ws.current = socket;

                    socket.onopen = () => {
                        setStatus('connected');
                        const subMsg = {
                            tsSubCmds: [{
                                entityType: "DEVICE",
                                entityId: process.env.NEXT_PUBLIC_DEVICE_ID,
                                scope: "LATEST_TELEMETRY",
                                cmdId: 10
                            }],
                            historyCmds: [],
                            attrSubCmds: []
                        };
                        socket.send(JSON.stringify(subMsg));
                    };

                    socket.onmessage = (event) => {
                        const msg = JSON.parse(event.data);
                        if (msg.data) {
                            const newData: TelemetryData = {};
                            Object.keys(msg.data).forEach(key => {
                                newData[key] = msg.data[key][0][1];
                            });

                            // FIX 2: Timestamp Age Check — ignore if ThingsBoard's stored timestamp
                            // is older than 10 seconds (means bridge is dead, just DB replay)
                            const tsBridgeMs = newData.ts ? Number(newData.ts) : Date.now();
                            const dataAgeMs = Date.now() - tsBridgeMs;
                            if (dataAgeMs > 10000) {
                                // Stale data from ThingsBoard DB — do not update display or heartbeat
                                return;
                            }

                            const timestampedData = { ...newData, local_ts: Date.now() };
                            setData(prev => ({ ...prev, ...timestampedData }));
                            setLastUpdated(new Date());
                            lastRecvTime.current = Date.now();

                            // Alert Logic: Prioritize the 'alert_level' sent by the backend python script
                            const backendAlert = newData.alert_level;
                            if (backendAlert && backendAlert !== 'NORMAL') {
                                const newAlert = {
                                    ...timestampedData,
                                    id: `alert-${Date.now()}-${Math.random()}`,
                                    msg: backendAlert === 'CRITICAL' ? 'Immediate Shutdown Advised' : 'System Stress Detected'
                                };
                                setHistory(prev => {
                                    // Avoid duplicate alerts of the same level sequentially from backend spam
                                    if (prev[prev.length - 1] && prev[prev.length - 1].alert_level === backendAlert) return prev;
                                    return [...prev, newAlert].slice(-50); // Chronological: Newest at the END
                                });
                            } else {
                                const temp = newData.temperature ? Number(newData.temperature) : 0;
                                const rul = newData.hybrid_rul_pct ? Number(newData.hybrid_rul_pct) : 100;
                                if (temp > 75 || rul < 20) {
                                    // Fallback alert logic if backend isn't sending 'alert_level'
                                    const fallbackLevel = rul < 20 ? 'CRITICAL' : 'WARNING';
                                    const fallbackMsg = rul < 20 ? 'Critical Health Depletion' : 'High Thermal Stress Detected';

                                    setHistory(prev => {
                                        if (prev[prev.length - 1] && prev[prev.length - 1].alert_level === fallbackLevel) return prev;
                                        return [...prev, {
                                            ...timestampedData,
                                            id: `alert-${Date.now()}-${Math.random()}`,
                                            alert_level: fallbackLevel,
                                            msg: fallbackMsg
                                        }].slice(-50);
                                    });
                                }
                            }

                            localStorage.setItem('last_telemetry', JSON.stringify(timestampedData));
                        }
                    };

                    socket.onclose = () => {
                        if (!demoMode) setStatus('disconnected');
                        setTimeout(() => { if (!demoMode) connect(); }, 5000);
                    };
                } catch (e) {
                    console.error("WS Error", e);
                }
            };

            connect();

            // FIX 1: Disconnection detection — hard clear data when timeout fires
            const checkStable = setInterval(() => {
                if (!demoMode && (Date.now() - lastRecvTime.current) > 5000) {
                    setStatus(prev => {
                        if (prev === 'connected') {
                            setData({}); // Hard clear stale data so UI shows '--'
                            return 'disconnected';
                        }
                        return prev;
                    });
                }
            }, 2000);

            return () => {
                ws.current?.close();
                clearInterval(checkStable);
            };
        }
    }, [demoMode, config]);

    // Advanced Demo Mode Simulation Logic (Physics Degradation Model)
    useEffect(() => {
        if (!demoMode) return;

        const interval = setInterval(() => {
            setData(prev => {
                const jitter = (range: number) => (Math.random() - 0.5) * range;
                const C = config?.constraints || { min_temp: 28, max_temp: 65, max_current: 45, min_rul: 0 };

                // 1. Ambient Thermal Drift (Capped at 65C, HOLD if Peak is initiated)
                const isPeakActive = (prev.inverter_current || 5) > 10 || (prev.temperature || 0) >= 64.5;
                const ambientTarget = isPeakActive ? 65.0 : 40.0;
                let newTemp = (prev.temperature || 40) + (ambientTarget - (prev.temperature || 40)) * 0.1 + jitter(0.5);
                newTemp = Math.min(Math.max(newTemp, C.min_temp), 65);

                // 2. Load & Current Logic (Nominal baseline: 5.0A, drift back always)
                const currentLimit = C.max_current || 45;
                const currentTarget = 5.0; // Always drift back to nominal
                let newCurrent = (prev.inverter_current || 5) + (currentTarget - (prev.inverter_current || 5)) * 0.1 + jitter(0.5);
                newCurrent = Math.min(Math.max(newCurrent, 0), currentLimit);

                // 2b. Switching Frequency & Inrush Ratio
                const isStressMode = newCurrent > 10;
                
                // Switching Frequency: 4.0 - 18.0 /hr
                let newFreq = (prev.switching_frequency || 12) + jitter(0.2);
                newFreq = Math.min(Math.max(newFreq, 4.0), 18.0);
                
                // Inrush Ratio: 4.0% - 15.0% (Normal) or 80.0% - 95.0% (Stress)
                // We use percentage values (0-100) to match UI display and severity thresholds
                const inrushTarget = isStressMode ? (80.0 + Math.random() * 15.0) : (4.0 + Math.random() * 11.0);
                let newInrush = (prev.inrush_ratio || 8.0) + (inrushTarget - (prev.inrush_ratio || 8.0)) * 0.4;

                 // 3. Compounding Physics RUL Formula
                // RUL = 100 - (cycles / 1000) * exp(current / 10) * 2^((T - 25) / 10)
                const cycles = (prev.cycle_count || 5000) + (Math.random() > 0.8 ? 1 : 0);
                const stressFactor = Math.pow(2, (newTemp - 25) / 10);
                const currentPenalty = Math.exp(newCurrent / 10);
                const damage = (cycles / 1000) * currentPenalty * stressFactor;
                
                const targetRUL = Math.max(100 - damage, 0);
                
                // Physics Rule: RUL must be monotonic (only decrease)
                const physicsRul = Math.min(prev.physics_rul_pct !== undefined ? prev.physics_rul_pct : 100, targetRUL);
                
                // ML RUL: Derived from physics with ±3% variance (offsetting)
                const mlRulRaw = physicsRul + (Math.random() - 0.5) * 6;
                const mlRul = Math.min(Math.max(mlRulRaw, 0), 100);

                // Hybrid RUL Calculation (Weighted Blend)
                // When physics_rul is high (100), weight_ml is 0. 
                // When physics_rul is low (0), weight_ml is 1.
                const w_ml = 1 - (physicsRul / 100);
                const w_physics = 1 - w_ml;
                const hybridRul = (w_physics * physicsRul) + (w_ml * mlRul);

                // 4. Alert Logic Correlated to Physics state
                // 65C is Hardware Trip Point; RUL < 5% is Critical Depletion
                const alert = (newTemp >= 64.5 || physicsRul < 5) ? 'CRITICAL' : physicsRul < 45 ? 'WARNING' : 'NORMAL';

                const update = {
                    ...prev,
                    temperature: newTemp,
                    inverter_current: newCurrent,
                    switching_frequency: newFreq,
                    inrush_ratio: newInrush,
                    hybrid_rul_pct: hybridRul,
                    physics_rul_pct: physicsRul,
                    ml_rul_pct: mlRul,
                    alert_level: alert,
                    cycle_count: cycles,
                    local_ts: Date.now()
                };

                if (alert !== prev.alert_level && alert !== 'NORMAL') {
                    setHistory(h => [...h, {
                        ...update,
                        id: `alert-demo-${Date.now()}`,
                        msg: alert === 'CRITICAL' ? 'Immediate Shutdown Advised' : 'System Stress Detected'
                    }].slice(-50));
                }

                lastRecvTime.current = Date.now();
                return update;
            });
            setLastUpdated(new Date());
        }, 1500);

        return () => clearInterval(interval);
    }, [demoMode, config]);

    const simulateStress = (type: 'temp' | 'inrush') => {
        if (demoMode) {
            setData(prev => ({
                ...prev,
                temperature: type === 'temp' ? 65 : prev.temperature,
                inrush_ratio: type === 'inrush' ? 92.0 : prev.inrush_ratio,
                inverter_current: type === 'inrush' ? 27.5 : prev.inverter_current
            }));
            return;
        }

        if (status !== 'connected' || !ws.current) return;
        const rpcMsg = {
            rpcCmds: [{
                entityType: "DEVICE",
                entityId: process.env.NEXT_PUBLIC_DEVICE_ID,
                query: { method: "simulateStress", params: { type }, timeout: 5000 },
                cmdId: 20
            }]
        };
        ws.current.send(JSON.stringify(rpcMsg));
    };

    const handleSetDemoMode = (val: boolean) => {
        if (val) {
            // Hard-isolate demo mode: clear live data, set defaults, switch status instantly
            setData({
                cycle_count: 5020,
                temperature: 42.5,
                inverter_current: 5.0,
                switching_frequency: 12.4,
                inrush_ratio: 8.2,
                hybrid_rul_pct: 73.2,
                physics_rul_pct: 75.0,
                ml_rul_pct: 72.8,
                inverter_status: 1,
                local_ts: Date.now()
            });
            setStatus('demo');
        } else {
            // Hard-isolate live mode: wipe demo data, let WS reconnect fill it
            setData({});
            setStatus('syncing');
            lastRecvTime.current = Date.now();
        }
        setDemoMode(val); // triggers the useEffect for WS/interval management
    };

    return (
        <TelemetryContext.Provider value={{
            data, status, lastUpdated, history, demoMode, setDemoMode: handleSetDemoMode, simulateStress
        }}>
            {children}
        </TelemetryContext.Provider>
    );
};

export const useTelemetry = () => {
    const context = useContext(TelemetryContext);
    if (!context) throw new Error("useTelemetry must be used within a TelemetryProvider");
    return context;
};
