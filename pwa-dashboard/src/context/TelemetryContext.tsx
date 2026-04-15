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

    const ws = useRef<WebSocket | null>(null);

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
            // Initialize demo data if blank
            setData(prev => ({
                cycle_count: prev.cycle_count ?? 5020,
                temperature: prev.temperature ?? 42.5,
                inverter_current: prev.inverter_current ?? 18.2,
                switching_frequency: prev.switching_frequency ?? 3.2,
                inrush_ratio: prev.inrush_ratio ?? 0.8,
                hybrid_rul_pct: prev.hybrid_rul_pct ?? 100,
                physics_rul_pct: prev.physics_rul_pct ?? 100,
                inverter_status: prev.inverter_status ?? 1
            }));
        } else {
            // Real mode - Ensure we clear the data state to show blank placeholders while waiting for connection
            setData({});
        }

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

                        const timestampedData = { ...newData, local_ts: Date.now() };
                        setData(prev => ({ ...prev, ...timestampedData }));
                        setLastUpdated(new Date());

                        // Alert Logic: Prioritize the 'alert_level' sent by the backend python script
                        const backendAlert = newData.alert_level;
                        if (backendAlert && backendAlert !== 'NORMAL') {
                            const newAlert = {
                                ...timestampedData,
                                msg: backendAlert === 'CRITICAL' ? 'Immediate Shutdown Advised' : 'System Stress Detected'
                            };
                            setHistory(prev => {
                                // Avoid duplicate alerts of the same level sequentially from backend spam
                                if (prev[0] && prev[0].alert_level === backendAlert) return prev;
                                return [newAlert, ...prev].slice(0, 50);
                            });
                        } else {
                            const temp = newData.temperature ? Number(newData.temperature) : 0;
                            const rul = newData.hybrid_rul_pct ? Number(newData.hybrid_rul_pct) : 100;
                            if (temp > 75 || rul < 20) {
                                // Fallback alert logic if backend isn't sending 'alert_level'
                                const fallbackLevel = rul < 20 ? 'CRITICAL' : 'WARNING';
                                const fallbackMsg = rul < 20 ? 'Critical Health Depletion' : 'High Thermal Stress Detected';

                                setHistory(prev => {
                                    if (prev[0] && prev[0].alert_level === fallbackLevel) return prev;
                                    return [{
                                        ...timestampedData,
                                        alert_level: fallbackLevel,
                                        msg: fallbackMsg
                                    }, ...prev].slice(0, 50);
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
        return () => ws.current?.close();
    }, [demoMode]);

    // Demo Mode Simulation Logic
    useEffect(() => {
        if (!demoMode) return;

        const interval = setInterval(() => {
            setData(prev => {
                const jitter = (range: number) => (Math.random() - 0.5) * range;

                const newTemp = Math.min(Math.max((prev.temperature || 40) + jitter(0.8), 25), 90);
                const newCurrent = Math.min(Math.max((prev.inverter_current || 15) + jitter(2), 0), 40);
                const stress = (newTemp > 65 ? 0.5 : 0.05) + (newCurrent > 30 ? 0.3 : 0.01);
                const newRUL = Math.max((prev.hybrid_rul_pct || 100) - stress / 10, 0);

                const alert = newRUL < 20 ? 'CRITICAL' : newRUL < 40 ? 'WARNING' : 'NORMAL';

                const update = {
                    ...prev,
                    temperature: newTemp,
                    inverter_current: newCurrent,
                    hybrid_rul_pct: newRUL,
                    physics_rul_pct: newRUL + (Math.random() * 5),
                    alert_level: alert,
                    local_ts: Date.now()
                };

                if (alert !== prev.alert_level && alert !== 'NORMAL') {
                    setHistory(h => [{
                        ...update,
                        msg: alert === 'CRITICAL' ? 'Immediate Shutdown Advised' : 'System Stress Detected'
                    }, ...h].slice(0, 50));
                }

                return update;
            });
            setLastUpdated(new Date());
        }, 2000);

        return () => clearInterval(interval);
    }, [demoMode]);

    const simulateStress = (type: 'temp' | 'inrush') => {
        if (demoMode) {
            setData(prev => ({
                ...prev,
                temperature: type === 'temp' ? 85 : prev.temperature,
                inrush_ratio: type === 'inrush' ? 15 : prev.inrush_ratio,
                inverter_current: type === 'inrush' ? 35 : prev.inverter_current
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

    return (
        <TelemetryContext.Provider value={{
            data, status, lastUpdated, history, demoMode, setDemoMode, simulateStress
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
