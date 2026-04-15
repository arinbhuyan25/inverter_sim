"""
modbus_mqtt_bridge.py — Edge Gateway
=====================================
Polls the Inverter Simulator via Modbus TCP every 2 seconds, performs
edge analytics, and publishes JSON telemetry to ThingsBoard MQTT.

Edge logic:
  - Detects every MAINS_OK (3012) state change → switching event
  - Flags inrush event when LINE_OVERLOAD (3059) == 1 at time of switch
  - Computes switching_frequency (switches / hours elapsed today)
  - Computes inrush_ratio (inrush_events / total_switches)

Env vars (see .env.example):
  MQTT_HOST, MQTT_PORT, THINGSBOARD_ACCESS_TOKEN,
  MODBUS_HOST, MODBUS_PORT, MODBUS_UNIT_ID, POLL_INTERVAL
"""

import json
import logging
import os
import signal
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BRIDGE] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Config from environment ──────────────────────────────────────────────────
MQTT_HOST   = os.getenv("MQTT_HOST",   "mqtt.thingsboard.cloud")
MQTT_PORT   = int(os.getenv("MQTT_PORT", "1883"))
TB_TOKEN    = os.getenv("THINGSBOARD_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN_HERE")
DEVICE_ID   = os.getenv("DEVICE_ID",   "INV_001")

MODBUS_HOST = os.getenv("MODBUS_HOST",    "localhost")
MODBUS_PORT = int(os.getenv("MODBUS_PORT", "5020"))
MODBUS_UNIT = int(os.getenv("MODBUS_UNIT_ID", "1"))
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "2"))

TELEMETRY_TOPIC = "v1/devices/me/telemetry"

# ── Register addresses ────────────────────────────────────────────────────────
REG_MAINS_VOLTAGE  = 3004
REG_TRIP_CODE      = 3007
REG_MAINS_OK       = 3012
REG_TEMPERATURE    = 3019
REG_GRID_CURRENT   = 3052
REG_INV_VOLTAGE    = 3053
REG_INV_CURRENT    = 3054
REG_GRID_FREQ      = 3058
REG_LINE_OVERLOAD  = 3059
REG_CYCLE_COUNT    = 3100
REG_PHYSICS_HEALTH = 3101

# All contiguous register spans we need (start, count)
# We read in two spans to avoid gaps.
_SPANS = [
    (REG_MAINS_VOLTAGE, 1),   # 3004
    (REG_TRIP_CODE,     1),   # 3007
    (REG_MAINS_OK,      1),   # 3012
    (REG_TEMPERATURE,   1),   # 3019
    (REG_GRID_CURRENT,  5),   # 3052–3059 (GRID_CT, INV_V, INV_I, FREQ, OVERLOAD)
    (REG_CYCLE_COUNT,   2),   # 3100–3101
]


# ── Edge state ────────────────────────────────────────────────────────────────
@dataclass
class EdgeState:
    last_mains_ok:    Optional[int] = None
    total_switches:   int           = 0
    inrush_events:    int           = 0
    switches_today:   int           = 0
    day_start:        float         = field(default_factory=lambda: _today_start())


def _today_start() -> float:
    """Unix timestamp of midnight (local time) for today."""
    now = datetime.now()
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.timestamp()


def _detect_switch(state: EdgeState, mains_ok: int, line_overload: int) -> bool:
    """
    Returns True if a switching event occurred.
    Updates state counters in-place.
    """
    if state.last_mains_ok is None:
        state.last_mains_ok = mains_ok
        return False

    switched = mains_ok != state.last_mains_ok
    if switched:
        state.total_switches  += 1
        state.switches_today  += 1
        if line_overload == 1:
            state.inrush_events += 1
        logger.info(
            "⚡ Switch event #%d | mains_ok %d→%d | overload=%d | inrush_events=%d",
            state.total_switches,
            state.last_mains_ok, mains_ok,
            line_overload, state.inrush_events,
        )
    state.last_mains_ok = mains_ok
    return switched


def _midnight_reset(state: EdgeState) -> None:
    """Reset daily counters at midnight."""
    today = _today_start()
    if today > state.day_start:
        logger.info("🌅 Midnight reset — switches_today was %d", state.switches_today)
        state.switches_today = 0
        state.day_start      = today


def _compute_metrics(state: EdgeState) -> tuple[float, float]:
    """
    Returns (switching_frequency, inrush_ratio).

    switching_frequency = switches_today / hours_elapsed_today * 24
    inrush_ratio        = inrush_events / total_switches
    """
    hours_elapsed = (time.time() - state.day_start) / 3600.0
    hours_elapsed = max(hours_elapsed, 1 / 3600.0)   # avoid /0

    switching_frequency = (state.switches_today / hours_elapsed) * 24.0
    inrush_ratio = (
        state.inrush_events / state.total_switches
        if state.total_switches > 0 else 0.0
    )
    return round(switching_frequency, 4), round(inrush_ratio, 4)


# ── Modbus helpers ────────────────────────────────────────────────────────────
def _read_register(client: ModbusTcpClient, address: int) -> Optional[int]:
    """Read a single holding register. Returns None on error."""
    result = client.read_holding_registers(address, count=1, slave=MODBUS_UNIT)
    if result.isError():
        logger.warning("Modbus read error @ %d: %s", address, result)
        return None
    return result.registers[0]


def _read_all_registers(client: ModbusTcpClient) -> Optional[dict]:
    """
    Read all required registers. Returns a dict of raw values or None if
    any read fails (caller should handle gracefully).
    """
    def safe_read(addr, count=1):
        r = client.read_holding_registers(addr, count=count, slave=MODBUS_UNIT)
        if r.isError():
            raise ModbusException(f"Error reading {addr}: {r}")
        return r.registers

    try:
        mv   = safe_read(REG_MAINS_VOLTAGE, 1)
        tc   = safe_read(REG_TRIP_CODE,     1)
        mok  = safe_read(REG_MAINS_OK,      1)
        tmp  = safe_read(REG_TEMPERATURE,   1)
        span = safe_read(REG_GRID_CURRENT,  8)   # 3052–3059
        cyc  = safe_read(REG_CYCLE_COUNT,   2)   # 3100–3101
    except ModbusException as exc:
        logger.error("Modbus read failed: %s", exc)
        return None

    return {
        "mains_voltage":    mv[0],
        "trip_code":        tc[0],
        "mains_ok":         mok[0],
        "temperature":      tmp[0],
        "grid_current":     span[0],   # 3052
        "inv_voltage":      span[1],   # 3053
        "inv_current":      span[2],   # 3054
        "grid_freq":        span[6],   # 3058
        "line_overload":    span[7],   # 3059
        "cycle_count":      cyc[0],    # 3100
        "physics_health":   cyc[1],    # 3101
    }


# ── MQTT ──────────────────────────────────────────────────────────────────────
_mqtt_connected = False

def _on_connect(client, userdata, flags, rc, properties=None):
    global _mqtt_connected
    if rc == 0:
        _mqtt_connected = True
        logger.info("✅ MQTT connected to %s:%d", MQTT_HOST, MQTT_PORT)
    else:
        _mqtt_connected = False
        logger.error("MQTT connection failed (rc=%d)", rc)


def _on_disconnect(client, userdata, rc, properties=None, reason=None):
    global _mqtt_connected
    _mqtt_connected = False
    logger.warning("MQTT disconnected (rc=%d). Will reconnect…", rc)


def _build_mqtt_client() -> mqtt.Client:
    client = mqtt.Client(
        client_id=f"bridge_{DEVICE_ID}",
        protocol=mqtt.MQTTv5,
    )
    client.username_pw_set(username=TB_TOKEN, password="")
    client.on_connect    = _on_connect
    client.on_disconnect = _on_disconnect
    return client


def _mqtt_connect_with_backoff(client: mqtt.Client) -> None:
    """Attempt MQTT connection with exponential backoff (max 60 s)."""
    delay = 1.0
    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_start()
            time.sleep(1.5)   # allow on_connect to fire
            if _mqtt_connected:
                return
        except Exception as exc:
            logger.warning("MQTT connect error: %s — retry in %.0fs", exc, delay)
        time.sleep(delay)
        delay = min(delay * 2, 60.0)


def _publish(client: mqtt.Client, payload: dict) -> None:
    """Publish JSON telemetry. Reconnects if disconnected."""
    global _mqtt_connected
    if not _mqtt_connected:
        logger.warning("MQTT not connected — attempting reconnect…")
        _mqtt_connect_with_backoff(client)

    msg = json.dumps(payload)
    result = client.publish(TELEMETRY_TOPIC, msg, qos=1)
    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        logger.error("MQTT publish failed (rc=%d)", result.rc)
    else:
        logger.info(
            "📤 Published | RUL=null | mains_ok=%d | cycles=%d | sw_freq=%.2f | inrush=%.3f",
            payload["mains_ok"], payload["cycle_count"],
            payload["switching_frequency"], payload["inrush_ratio"],
        )


# ── Main polling loop ─────────────────────────────────────────────────────────
def main():
    logger.info("🔌 Modbus-MQTT Bridge starting…")
    logger.info("   Modbus  → %s:%d (unit %d)", MODBUS_HOST, MODBUS_PORT, MODBUS_UNIT)
    logger.info("   MQTT    → %s:%d", MQTT_HOST, MQTT_PORT)
    logger.info("   Topic   → %s", TELEMETRY_TOPIC)
    logger.info("   Polling → every %.1fs", POLL_INTERVAL)

    edge_state = EdgeState()

    # ── MQTT setup ──────────────────────────────────────────────────────────
    mqtt_client = _build_mqtt_client()
    _mqtt_connect_with_backoff(mqtt_client)

    # ── Modbus setup ────────────────────────────────────────────────────────
    modbus_client = ModbusTcpClient(MODBUS_HOST, port=MODBUS_PORT)
    modbus_backoff = 1.0

    def _graceful_exit(sig, frame):
        logger.info("Shutting down bridge…")
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        modbus_client.close()
        sys.exit(0)

    signal.signal(signal.SIGINT,  _graceful_exit)
    signal.signal(signal.SIGTERM, _graceful_exit)

    # ── Polling loop ────────────────────────────────────────────────────────
    while True:
        loop_start = time.monotonic()

        # Midnight counter reset
        _midnight_reset(edge_state)

        # Modbus connect / reconnect
        if not modbus_client.is_socket_open():
            logger.warning("Modbus disconnected — reconnecting in %.0fs…", modbus_backoff)
            time.sleep(modbus_backoff)
            modbus_backoff = min(modbus_backoff * 2, 60.0)
            connected = modbus_client.connect()
            if not connected:
                continue
            modbus_backoff = 1.0
            logger.info("✅ Modbus reconnected")

        # Read registers
        raw = _read_all_registers(modbus_client)
        if raw is None:
            modbus_client.close()
            continue

        # Edge detection
        _detect_switch(edge_state, raw["mains_ok"], raw["line_overload"])

        # Compute derived metrics
        sw_freq, inrush_ratio = _compute_metrics(edge_state)

        # Build telemetry payload (exact schema agreed with teammate)
        ts_ms = int(time.time() * 1000)
        payload = {
            "device_id":          DEVICE_ID,
            "ts":                 ts_ms,
            "mains_voltage":      round(raw["mains_voltage"]  / 10.0, 1),
            "inverter_current":   round(raw["inv_current"]    / 10.0, 2),
            "temperature":        round(raw["temperature"]    / 10.0, 1),
            "mains_ok":           raw["mains_ok"],
            "trip_code":          raw["trip_code"],
            "line_overload":      raw["line_overload"],
            "grid_frequency":     round(raw["grid_freq"]      / 10.0, 2),
            "cycle_count":        raw["cycle_count"],
            "physics_health_index": raw["physics_health"],
            "switching_frequency": sw_freq,
            "inrush_ratio":       inrush_ratio,
            "ml_rul_pct":         None,    # filled in by mqtt_backend.py
            "alert_level":        "NORMAL",
        }

        _publish(mqtt_client, payload)

        # Sleep for remainder of poll interval
        elapsed = time.monotonic() - loop_start
        sleep_for = max(0.0, POLL_INTERVAL - elapsed)
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
