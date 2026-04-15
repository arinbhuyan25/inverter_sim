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
    const [data, setData] = useState<TelemetryData>({
        cycle_count: 5020,
        temperature: 42.5,
        inverter_current: 18.2,
        switching_frequency: 3.2,
        inrush_ratio: 0.8,
        hybrid_rul_pct: 100,
        physics_rul_pct: 100,
        inverter_status: 1
    });
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'demo'>('disconnected');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [history, setHistory] = useState<TelemetryData[]>([]);
    const [demoMode, setDemoMode] = useState(false);

    const ws = useRef<WebSocket | null>(null);

    // Initial load
    useEffect(() => {
        const saved = localStorage.getItem('last_telemetry');
        if (saved) {
            const parsed = JSON.parse(saved);
            setData(parsed);
            setLastUpdated(new Date(parsed.local_ts || Date.now()));
        }
    }, []);

    // WebSocket Management (Only if NOT in demo mode)
    useEffect(() => {
        if (demoMode) {
            setStatus('demo');
            if (ws.current) ws.current.close();
            return;
        }

        const connect = () => {
            const host = process.env.NEXT_PUBLIC_TB_HOST || 'eu.thingsboard.cloud';
            const token = process.env.NEXT_PUBLIC_TB_TOKEN;

            if (!token) return;

            setStatus('syncing');
            const url = `wss://${host}/api/ws/plugins/telemetry?token=${token}`;

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
                        setHistory(prev => [timestampedData, ...prev].slice(0, 100));
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
                // Micro jitter for realism
                const jitter = (range: number) => (Math.random() - 0.5) * range;

                const newTemp = Math.min(Math.max((prev.temperature || 40) + jitter(0.8), 25), 90);
                const newCurrent = Math.min(Math.max((prev.inverter_current || 15) + jitter(2), 0), 40);

                // Simple Physics RUL degradation logic for demo
                const stress = (newTemp > 65 ? 0.5 : 0.05) + (newCurrent > 30 ? 0.3 : 0.01);
                const newRUL = Math.max((prev.hybrid_rul_pct || 100) - stress / 10, 0);

                const alert = newRUL < 20 ? 'CRITICAL' : newRUL < 40 ? 'WARNING' : 'NORMAL';

                const update = {
                    ...prev,
                    temperature: newTemp,
                    inverter_current: newCurrent,
                    hybrid_rul_pct: newRUL,
                    physics_rul_pct: newRUL + (Math.random() * 5), // Physics is less accurate
                    alert_level: alert,
                    local_ts: Date.now()
                };

                // Add to history if a state change happened (e.g. alert status changed)
                if (alert !== prev.alert_level && alert !== 'NORMAL') {
                    setHistory(h => [update, ...h].slice(0, 50));
                }

                return update;
            });
            setLastUpdated(new Date());
        }, 2000);

        return () => clearInterval(interval);
    }, [demoMode]);

    const simulateStress = (type: 'temp' | 'inrush') => {
        if (demoMode) {
            // Locally inject stress for demo
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
