"""
mqtt_backend.py — Cloud Intelligence / ML Subscriber
======================================================
Subscribes to ThingsBoard telemetry, runs hybrid RUL inference for every
message, and publishes the enriched result back. High-priority alerts
are additionally published to a dedicated mobile-app topic.

Env vars (see .env.example):
  MQTT_HOST, MQTT_PORT, THINGSBOARD_ACCESS_TOKEN,
  ALERT_DEVICE_TOKEN, DEVICE_ID
"""

import json
import logging
import os
import signal
import sys
import time

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from rul_engine import hybrid_rul, load_model

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BACKEND] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MQTT_HOST         = os.getenv("MQTT_HOST",   "mqtt.thingsboard.cloud")
MQTT_PORT         = int(os.getenv("MQTT_PORT", "1883"))
TB_TOKEN          = os.getenv("THINGSBOARD_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN_HERE")
ALERT_TOKEN       = os.getenv("ALERT_DEVICE_TOKEN", TB_TOKEN)   # separate mobile device
DEVICE_ID         = os.getenv("DEVICE_ID",   "INV_001")

TELEMETRY_TOPIC   = "v1/devices/me/telemetry"
ALERT_TOPIC       = "v1/devices/me/telemetry"   # published via alert_client

ALERT_LEVELS      = {"WARNING", "CRITICAL"}

# ── Load ML model once at startup ────────────────────────────────────────────
logger.info("Loading RUL model…")
try:
    _model, _scaler = load_model()
    logger.info("✅ Model loaded successfully")
except FileNotFoundError as exc:
    logger.critical("Cannot start backend — %s", exc)
    sys.exit(1)


# ── MQTT clients ──────────────────────────────────────────────────────────────
# We use two separate clients:
#   telemetry_client  — subscribes to bridge telemetry, publishes enriched data
#   alert_client      — publishes simplified alert payloads to mobile topic

def _make_client(name: str, token: str, callbacks: dict) -> mqtt.Client:
    client = mqtt.Client(client_id=name, protocol=mqtt.MQTTv5)
    client.username_pw_set(username=token, password="")
    for event, fn in callbacks.items():
        setattr(client, event, fn)
    return client


def _connect_with_backoff(client: mqtt.Client, host: str, port: int) -> None:
    """Block until connected."""
    delay = 1.0
    while True:
        try:
            client.connect(host, port, keepalive=60)
            client.loop_start()
            time.sleep(1.5)
            return
        except Exception as exc:
            logger.warning("MQTT connect error (%s): %s — retry in %.0fs",
                           client._client_id.decode(), exc, delay)
            time.sleep(delay)
            delay = min(delay * 2, 60.0)


# ── Inference & publish  ──────────────────────────────────────────────────────
_pub_client  = None    # publishing (enriched) client — set after connect
_alert_pub   = None    # alert publishing client


def _process_message(data: dict) -> dict:
    """Run RUL inference and return enriched payload."""
    result = hybrid_rul(
        cycle_count           = int(data.get("cycle_count",           0)),
        avg_current           = float(data.get("inverter_current",    0.0)),
        avg_temperature       = float(data.get("temperature",         25.0)),
        switching_frequency   = float(data.get("switching_frequency", 0.0)),
        inrush_ratio          = float(data.get("inrush_ratio",        0.0)),
        model                 = _model,
        scaler                = _scaler,
        physics_health_index  = int(data.get("physics_health_index",  1000)),
    )

    enriched = {**data, **result}
    # Overwrite the bridge's placeholder values
    enriched["ml_rul_pct"]  = result["ml_rul_pct"]
    enriched["alert_level"] = result["alert_level"]
    return enriched


def _publish_enriched(client: mqtt.Client, payload: dict) -> None:
    msg = json.dumps({k: v for k, v in payload.items() if k != "ml_rul_pct" or v is not None})
    rc = client.publish(TELEMETRY_TOPIC, msg, qos=1).rc
    if rc != mqtt.MQTT_ERR_SUCCESS:
        logger.error("Enriched publish failed (rc=%d)", rc)
    else:
        level = payload.get("alert_level", "?")
        rul   = payload.get("hybrid_rul_pct", "?")
        logger.info(
            "📊 Enriched | RUL=%.1f%% | Physics=%.1f%% | Hybrid=%.1f%% | %s",
            payload.get("ml_rul_pct", 0),
            payload.get("physics_rul_pct", 0),
            rul if isinstance(rul, float) else 0,
            level,
        )


def _publish_alert(client: mqtt.Client, payload: dict) -> None:
    alert_payload = {
        "device_id":      payload.get("device_id", DEVICE_ID),
        "alert_level":    payload["alert_level"],
        "hybrid_rul_pct": payload.get("hybrid_rul_pct"),
        "cycle_count":    payload.get("cycle_count"),
        "ts":             payload.get("ts"),
        "message":        _alert_message(payload["alert_level"], payload.get("hybrid_rul_pct", 0)),
    }
    msg = json.dumps(alert_payload)
    rc = client.publish(ALERT_TOPIC, msg, qos=1).rc
    if rc != mqtt.MQTT_ERR_SUCCESS:
        logger.error("Alert publish failed (rc=%d)", rc)
    else:
        logger.warning(
            "🚨 ALERT [%s] → mobile topic | Hybrid RUL=%.1f%%",
            alert_payload["alert_level"],
            alert_payload["hybrid_rul_pct"] or 0,
        )


def _alert_message(level: str, rul_pct: float) -> str:
    messages = {
        "CRITICAL": f"⛔ Relay RUL critically low ({rul_pct:.1f}%) — schedule maintenance immediately!",
        "WARNING":  f"⚠️ Relay RUL degrading ({rul_pct:.1f}%) — plan maintenance soon.",
    }
    return messages.get(level, "Relay health status update.")


# ── MQTT callbacks ────────────────────────────────────────────────────────────
def _on_connect_sub(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info("✅ Subscriber connected")
        client.subscribe(TELEMETRY_TOPIC, qos=1)
        logger.info("   Subscribed to: %s", TELEMETRY_TOPIC)
    else:
        logger.error("Subscriber connect failed (rc=%d)", rc)


def _on_disconnect_sub(client, userdata, rc, properties=None, reason=None):
    logger.warning("Subscriber disconnected (rc=%d) — will reconnect…", rc)


def _on_message(client, userdata, msg):
    """Callback for every incoming telemetry message."""
    try:
        data = json.loads(msg.payload.decode())
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.error("Failed to parse message: %s", exc)
        return

    # Guard: skip messages that are already enriched (avoid feedback loop)
    if data.get("hybrid_rul_pct") is not None:
        return

    try:
        enriched = _process_message(data)
    except Exception as exc:
        logger.error("RUL inference error: %s", exc)
        return

    _publish_enriched(_pub_client, enriched)

    if enriched.get("alert_level") in ALERT_LEVELS:
        _publish_alert(_alert_pub, enriched)


def _on_connect_pub(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info("✅ Publisher connected")
    else:
        logger.error("Publisher connect failed (rc=%d)", rc)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    global _pub_client, _alert_pub

    logger.info("🧠 MQTT Backend starting…")
    logger.info("   Broker  → %s:%d", MQTT_HOST, MQTT_PORT)

    # Subscriber (also publishes enriched data on same token)
    sub_client = _make_client(
        f"backend_sub_{DEVICE_ID}",
        TB_TOKEN,
        {
            "on_connect":    _on_connect_sub,
            "on_disconnect": _on_disconnect_sub,
            "on_message":    _on_message,
        },
    )

    # Publisher for enriched telemetry (same device token)
    _pub_client = _make_client(
        f"backend_pub_{DEVICE_ID}",
        TB_TOKEN,
        {"on_connect": _on_connect_pub},
    )

    # Alert publisher (separate mobile-app device token)
    _alert_pub = _make_client(
        f"backend_alert_{DEVICE_ID}",
        ALERT_TOKEN,
        {"on_connect": _on_connect_pub},
    )

    _connect_with_backoff(sub_client,  MQTT_HOST, MQTT_PORT)
    _connect_with_backoff(_pub_client,  MQTT_HOST, MQTT_PORT)
    _connect_with_backoff(_alert_pub,   MQTT_HOST, MQTT_PORT)

    logger.info("🟢 Backend running — waiting for telemetry…")

    def _graceful_exit(sig, frame):
        logger.info("Shutting down backend…")
        for c in (sub_client, _pub_client, _alert_pub):
            c.loop_stop()
            c.disconnect()
        sys.exit(0)

    signal.signal(signal.SIGINT,  _graceful_exit)
    signal.signal(signal.SIGTERM, _graceful_exit)

    # Keep main thread alive; callbacks handle everything
    while True:
        time.sleep(30)


if __name__ == "__main__":
    main()
