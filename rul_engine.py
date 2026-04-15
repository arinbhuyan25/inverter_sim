"""
rul_engine.py — Hybrid Physics + ML RUL Inference Engine
=========================================================
Provides load_model() and hybrid_rul() for the APOGEE'26 predictive
maintenance system. Blends physics-based health index with an ML model
prediction for a robust Remaining Useful Life estimate.
"""

import logging
from pathlib import Path

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# ── Model file paths ────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).parent
_MODEL_PATH = _BASE_DIR / "relay_rul_model.joblib"
_SCALER_PATH = _BASE_DIR / "relay_rul_scaler.joblib"

# ── Alert thresholds ────────────────────────────────────────────────────────
THRESHOLD_CRITICAL = 20.0   # RUL % → CRITICAL
THRESHOLD_WARNING  = 40.0   # RUL % → WARNING

# ── Physics model constants ─────────────────────────────────────────────────
MAX_RELAY_CYCLES   = 100_000   # rated mechanical endurance
TEMP_DERATING_BASE = 40.0      # °C above which derating kicks in
INRUSH_PENALTY_K   = 2.0       # amplification factor for inrush damage
FREQ_PENALTY_K     = 0.5       # per-switch-per-hour penalty


def load_model() -> tuple:
    """
    Load the pre-trained ML model and scaler from disk.

    Returns:
        (model, scaler) tuple — pass both into hybrid_rul().

    Raises:
        FileNotFoundError: if .joblib files are missing.
    """
    if not _MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {_MODEL_PATH}")
    if not _SCALER_PATH.exists():
        raise FileNotFoundError(f"Scaler file not found: {_SCALER_PATH}")

    model  = joblib.load(_MODEL_PATH)
    scaler = joblib.load(_SCALER_PATH)
    logger.info("Model loaded from %s", _MODEL_PATH)
    logger.info("Scaler loaded from %s", _SCALER_PATH)
    return model, scaler


def _physics_rul(
    cycle_count: int,
    avg_temperature: float,
    switching_frequency: float,
    inrush_ratio: float,
) -> float:
    """
    Physics-based RUL estimate (0–100 %).

    Penalises:
      - Cycle wear (linear depletion toward MAX_RELAY_CYCLES)
      - Thermal derating above TEMP_DERATING_BASE °C
      - High switching frequency (mechanical fatigue)
      - Inrush events (contact arc erosion)
    """
    # Base wear
    base_rul = max(0.0, 1.0 - cycle_count / MAX_RELAY_CYCLES) * 100.0

    # Thermal derating: −0.5 % per °C above threshold
    temp_excess     = max(0.0, avg_temperature - TEMP_DERATING_BASE)
    thermal_penalty = temp_excess * 0.5

    # Switching frequency fatigue: each extra switch/hour costs half a percent
    freq_penalty = switching_frequency * FREQ_PENALTY_K

    # Inrush arc erosion (amplified by ratio)
    inrush_penalty = inrush_ratio * INRUSH_PENALTY_K * 10.0

    physics_rul = base_rul - thermal_penalty - freq_penalty - inrush_penalty
    return float(np.clip(physics_rul, 0.0, 100.0))


def _ml_rul(
    cycle_count: int,
    avg_current: float,
    avg_temperature: float,
    switching_frequency: float,
    inrush_ratio: float,
    physics_health_index: int,
    model,
    scaler,
) -> float:
    """
    ML-based RUL estimate (0–100 %) using the pre-trained model.
    Feature order must match training: [cycle_count, avg_current,
    avg_temperature, switching_frequency, inrush_ratio, physics_health_index].
    """
    features = np.array([[
        cycle_count,
        avg_current,
        avg_temperature,
        switching_frequency,
        inrush_ratio,
        physics_health_index,
    ]], dtype=np.float64)

    features_scaled = scaler.transform(features)
    prediction      = model.predict(features_scaled)[0]
    return float(np.clip(prediction, 0.0, 100.0))


def _alert_level(rul_pct: float) -> str:
    if rul_pct < THRESHOLD_CRITICAL:
        return "CRITICAL"
    if rul_pct < THRESHOLD_WARNING:
        return "WARNING"
    return "NORMAL"


def hybrid_rul(
    cycle_count: int,
    avg_current: float,
    avg_temperature: float,
    switching_frequency: float,
    inrush_ratio: float,
    model,
    scaler,
    physics_health_index: int = 1000,
    weight_ml: float = 0.6,
) -> dict:
    """
    Hybrid RUL inference combining physics and ML models.

    Args:
        cycle_count:           Relay switching cycles (raw register 3100).
        avg_current:           Inverter current in Amps (register 3054 ÷ 10).
        avg_temperature:       Temperature in °C (register 3019 ÷ 10).
        switching_frequency:   Switches per hour (computed by bridge).
        inrush_ratio:          Fraction of switches that were inrush events.
        model:                 Pre-trained sklearn estimator from load_model().
        scaler:                Pre-trained sklearn scaler from load_model().
        physics_health_index:  Raw Physics Health register (3101), 0–1000.
                               6th feature expected by the pre-trained model.
        weight_ml:             Weight assigned to ML prediction (0–1).
                               Physics weight = 1 − weight_ml.

    Returns:
        dict with keys:
            ml_rul_pct      – ML model prediction (0–100)
            physics_rul_pct – Physics-based prediction (0–100)
            hybrid_rul_pct  – Weighted blend (0–100)
            weight_ml       – ML weight used
            alert_level     – "NORMAL" | "WARNING" | "CRITICAL"
    """
    weight_physics = 1.0 - weight_ml

    ml_rul  = _ml_rul(cycle_count, avg_current, avg_temperature,
                       switching_frequency, inrush_ratio, physics_health_index,
                       model, scaler)
    phy_rul = _physics_rul(cycle_count, avg_temperature,
                            switching_frequency, inrush_ratio)

    hybrid = weight_ml * ml_rul + weight_physics * phy_rul
    hybrid = float(np.clip(hybrid, 0.0, 100.0))

    level = _alert_level(hybrid)
    logger.debug(
        "RUL → ML=%.1f%% | Physics=%.1f%% | Hybrid=%.1f%% | %s",
        ml_rul, phy_rul, hybrid, level,
    )

    return {
        "ml_rul_pct":      round(ml_rul,    2),
        "physics_rul_pct": round(phy_rul,   2),
        "hybrid_rul_pct":  round(hybrid,    2),
        "weight_ml":       weight_ml,
        "alert_level":     level,
    }
