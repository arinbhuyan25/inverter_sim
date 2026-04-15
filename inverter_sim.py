"""
inverter_sim.py — Modbus TCP Slave Simulator
============================================
Simulates an Luminous inverter relay for APOGEE'26 hackathon testing.
Runs a Modbus TCP server on localhost:5020 (Unit ID 1) with 10 dynamic
holding registers that evolve over time with realistic physics behaviour.

Register Map (holding registers, FC3):
  3004  MAINS_VOLTAGE        scaled ×10  (e.g. 2314 → 231.4 V)
  3007  TRIP_CODE            raw int (0 = OK, codes 1–9 = faults)
  3012  MAINS_OK             raw 0/1  ← toggles to trigger edge detection
  3019  TEMPERATURE          scaled ×10  (e.g. 421 → 42.1 °C)
  3052  GRID_CT_CURRENT      scaled ×10
  3053  INV_VOLTAGE          scaled ×10
  3054  INVERTER_CURRENT     scaled ×10
  3058  GRID_FREQUENCY       scaled ×10  (e.g. 500 → 50.0 Hz)
  3059  LINE_OVERLOAD        raw 0/1
  3100  RELAY_CYCLE_COUNT    raw int (starts at 5 000, increments on switch)
  3101  PHYSICS_HEALTH       raw 0–1000 (1000 = perfect health)
"""

import logging
import random
import signal
import sys
import threading
import time

from pymodbus.datastore import (
    ModbusServerContext,
    ModbusSlaveContext,
    ModbusSequentialDataBlock,
)
from pymodbus.server import StartTcpServer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SIM] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Server config ────────────────────────────────────────────────────────────
HOST       = "localhost"
PORT       = 5020
UNIT_ID    = 1
UPDATE_HZ  = 1       # Register update frequency (seconds)

# ── Holding‑register offset (pymodbus uses 0-based addressing internally) ───
# pymodbus FC3 reads address N → datablock index N+1 for some versions,
# but with ModbusSequentialDataBlock starting at address 0 the simplest
# approach is to store values at their literal register address.
_REG_SIZE  = 3200    # allocate enough slots

# ── Simulation state ─────────────────────────────────────────────────────────
class SimState:
    mains_ok:      int   = 1
    cycle_count:   int   = 5_000
    health:        int   = 900       # out of 1000
    # mains toggle timing
    _next_toggle:  float = 0.0
    _toggle_interval: float = 20.0  # seconds between mains toggles

state = SimState()
state._next_toggle = time.time() + 20.0


def _update_registers(context):
    """Called every UPDATE_HZ seconds to evolve register values."""
    now = time.time()

    # ── Mains OK toggle ──────────────────────────────────────────────────────
    if now >= state._next_toggle:
        state.mains_ok = 1 - state.mains_ok          # flip 0↔1
        state.cycle_count += 1
        state.health = max(0, state.health - random.randint(1, 5))
        state._toggle_interval = random.uniform(15.0, 35.0)
        state._next_toggle = now + state._toggle_interval
        logger.info(
            "🔄 Mains toggled → mains_ok=%d | cycles=%d | health=%d",
            state.mains_ok, state.cycle_count, state.health,
        )

    # ── Realistic register values ────────────────────────────────────────────
    mains_voltage   = random.uniform(218.0, 242.0)
    temperature     = 35.0 + (state.cycle_count / 100_000) * 30.0 + random.gauss(0, 0.5)
    temperature     = max(25.0, min(85.0, temperature))
    inv_voltage     = random.uniform(220.0, 240.0)
    inv_current     = random.uniform(5.0, 18.0)
    grid_current    = inv_current * random.uniform(0.9, 1.05)
    grid_freq       = 50.0 + random.gauss(0, 0.05)
    trip_code       = 1 if state.health < 100 else 0
    line_overload   = 1 if inv_current > 15.0 and random.random() < 0.3 else 0

    registers = [0] * _REG_SIZE
    registers[3004] = int(mains_voltage * 10)
    registers[3007] = trip_code
    registers[3012] = state.mains_ok
    registers[3019] = int(temperature * 10)
    registers[3052] = int(grid_current * 10)
    registers[3053] = int(inv_voltage * 10)
    registers[3054] = int(inv_current * 10)
    registers[3058] = int(grid_freq * 10)
    registers[3059] = line_overload
    registers[3100] = state.cycle_count
    registers[3101] = state.health

    slave = context[UNIT_ID]
    slave.setValues(3, 0, registers)   # FC3 = holding registers, offset 0


def _updater_loop(context, stop_event: threading.Event):
    """Background thread: keeps registers alive."""
    while not stop_event.is_set():
        try:
            _update_registers(context)
        except Exception as exc:
            logger.error("Register update error: %s", exc)
        stop_event.wait(UPDATE_HZ)


def main():
    # ── Build datastore ──────────────────────────────────────────────────────
    block   = ModbusSequentialDataBlock(0, [0] * _REG_SIZE)
    store   = ModbusSlaveContext(hr=block)
    context = ModbusServerContext(slaves={UNIT_ID: store}, single=False)

    # Populate once before server starts
    _update_registers(context)

    # ── Start updater thread ─────────────────────────────────────────────────
    stop_event = threading.Event()
    updater = threading.Thread(
        target=_updater_loop, args=(context, stop_event), daemon=True
    )
    updater.start()

    # ── Graceful shutdown ────────────────────────────────────────────────────
    def _shutdown(sig, frame):
        logger.info("Shutting down simulator…")
        stop_event.set()
        sys.exit(0)

    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("🚀 Inverter Simulator running on %s:%d (unit=%d)", HOST, PORT, UNIT_ID)
    logger.info("   Mains will toggle every 15–35 s to exercise edge detection.")
    StartTcpServer(context=context, address=(HOST, PORT))


if __name__ == "__main__":
    main()
