# Predictive Maintenance & Early Warning System
### Luminous APOGEE '26 Hackathon — Communication Bridge Layer

Bridges a **Modbus TCP inverter simulator** to **ThingsBoard cloud** using a two-process architecture:

```
inverter_sim.py ──Modbus TCP──► modbus_mqtt_bridge.py ──MQTT──► ThingsBoard
                                                                      │
                                                               mqtt_backend.py
                                                            (RUL inference + alerts)
```

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure credentials
cp .env.example .env
# → Edit .env: set THINGSBOARD_ACCESS_TOKEN and ALERT_DEVICE_TOKEN

# 3. Start all three processes (three terminals)
python inverter_sim.py          # Terminal 1 — Modbus TCP slave
python modbus_mqtt_bridge.py    # Terminal 2 — Edge Gateway
python mqtt_backend.py          # Terminal 3 — Cloud Intelligence
```

---

## Files

| File | Role |
|------|------|
| `inverter_sim.py` | Modbus TCP slave (localhost:5020). Simulates 10 inverter registers with physics-realistic dynamics and automatic mains toggling. |
| `modbus_mqtt_bridge.py` | **Edge Gateway** — polls registers every 2 s, performs edge detection on Mains OK (3012), computes `switching_frequency` & `inrush_ratio`, publishes JSON to ThingsBoard. |
| `mqtt_backend.py` | **Cloud Intelligence** — subscribes to telemetry, calls `hybrid_rul()`, publishes enriched payload + mobile alerts. |
| `rul_engine.py` | Hybrid Physics + ML inference. Exposes `load_model()` and `hybrid_rul()`. |
| `relay_rul_model.joblib` | Pre-trained ML model (sklearn). |
| `relay_rul_scaler.joblib` | Pre-trained feature scaler. |

---

## MQTT Telemetry Schema

```json
{
  "device_id": "INV_001",
  "ts": 1718000000000,
  "mains_voltage": 231.4,
  "inverter_current": 8.2,
  "temperature": 42.1,
  "mains_ok": 1,
  "trip_code": 0,
  "line_overload": 0,
  "grid_frequency": 50.0,
  "cycle_count": 1842,
  "physics_health_index": 743,
  "switching_frequency": 12.4,
  "inrush_ratio": 0.08,
  "ml_rul_pct": 78.3,
  "physics_rul_pct": 72.1,
  "hybrid_rul_pct": 75.9,
  "weight_ml": 0.6,
  "alert_level": "NORMAL"
}
```

---

## Alert Levels

| Level | Hybrid RUL | Action |
|-------|-----------|--------|
| `NORMAL`   | ≥ 40 % | No action |
| `WARNING`  | 20–40 % | Plan maintenance |
| `CRITICAL` | < 20 % | Immediate action |

`WARNING` and `CRITICAL` alerts are additionally published to the `ALERT_DEVICE_TOKEN` mobile topic.

---

## Modbus Register Map

| Address | Field | Conversion |
|---------|-------|-----------|
| 3004 | Mains Voltage | ÷ 10 → V |
| 3007 | Trip Code | raw |
| 3012 | Mains OK ← edge detect | raw 0/1 |
| 3019 | Temperature | ÷ 10 → °C |
| 3052 | Grid Current | ÷ 10 → A |
| 3053 | Inv Voltage | ÷ 10 → V |
| 3054 | Inverter Current | ÷ 10 → A |
| 3058 | Grid Frequency | ÷ 10 → Hz |
| 3059 | Line Overload | raw 0/1 |
| 3100 | Relay Cycle Count | raw |
| 3101 | Physics Health Index | raw 0–1000 |

---

## ThingsBoard Dashboard Setup

See **[THINGSBOARD_SETUP.md](THINGSBOARD_SETUP.md)** for step-by-step widget configuration.

---

## Resilience Features

- **Modbus reconnect**: exponential backoff (1 s → 60 s max), switching event counter preserved in memory across reconnects
- **MQTT reconnect**: `on_disconnect` callback triggers exponential backoff
- **Midnight reset**: `switches_today` counter resets at local midnight; `total_switches` and `inrush_events` are cumulative
- **Feedback loop guard**: backend skips messages that already have `hybrid_rul_pct` set (prevents re-processing)
