# ThingsBoard Dashboard Setup Guide
### APOGEE '26 — Predictive Maintenance System

> All widgets pull from a single **Device Token** (your inverter device).
> Create the dashboard at: **ThingsBoard → Dashboards → Create new**.

---

## Step 1: Create the Device

1. Go to **Entities → Devices → Add device**
2. Name: `INV_001`
3. Copy the **Access Token** → paste into `.env` as `THINGSBOARD_ACCESS_TOKEN`
4. (Optional) Create a second device called `INV_001_ALERTS` for mobile alerts
   → Copy its token → paste into `.env` as `ALERT_DEVICE_TOKEN`

---

## Step 2: Create Dashboard

1. Go to **Dashboards → + (Add dashboard)**
2. Name: `Predictive Maintenance — INV_001`
3. Click **Open dashboard → Edit mode (pencil icon)**

---

## Step 3: Add Widgets

### Widget 1 — RUL Radial Gauge

| Setting | Value |
|---------|-------|
| Widget type | **Gauge → Radial gauge** |
| Data source | Device: `INV_001` → Key: `hybrid_rul_pct` |
| Min / Max | 0 / 100 |
| Red zone | 0 → 20 |
| Yellow zone | 20 → 40 |
| Green zone | 40 → 100 |
| Label | "Remaining Useful Life (%)" |

---

### Widget 2 — RUL + Physics Time-Series Chart

| Setting | Value |
|---------|-------|
| Widget type | **Charts → Time-series chart** |
| Data source 1 | Device: `INV_001` → Key: `hybrid_rul_pct` → Left Y-axis |
| Data source 2 | Device: `INV_001` → Key: `physics_health_index` → Right Y-axis |
| Time window | Last 1 hour, real-time |
| Colors | Line 1: `#00D4AA` (teal) / Line 2: `#FF6B35` (amber) |

---

### Widget 3 — Cycle Count Digital Gauge

| Setting | Value |
|---------|-------|
| Widget type | **Cards → Digital gauge** OR **Simple card** |
| Data source | Device: `INV_001` → Key: `cycle_count` |
| Label | "Total Relay Cycles" |
| Icon | ⚙️ |

---

### Widget 4 — Active Alarms Widget

| Setting | Value |
|---------|-------|
| Widget type | **Alarm widgets → Alarms table** |
| Alarm filter | Severity: WARNING + CRITICAL |
| Device | `INV_001` |

> **Important:** ThingsBoard alarms require alarm rules. Go to **Device Profiles → Edit → Alarm rules**:
> - Condition: `hybrid_rul_pct < 40` → Severity: **WARNING**
> - Condition: `hybrid_rul_pct < 20` → Severity: **CRITICAL**

---

### Widget 5 — Sensor Cards Row

Create three **Value cards** (widget type: **Cards → Value card**):

| Card | Key | Unit |
|------|-----|------|
| Temperature | `temperature` | °C |
| Inverter Current | `inverter_current` | A |
| Mains OK | `mains_ok` | (0/1) |

---

### Widget 6 — Alert Level Banner (Optional)

| Setting | Value |
|---------|-------|
| Widget type | **Cards → Simple card** |
| Data source | Key: `alert_level` |
| Background color rule | NORMAL=green, WARNING=orange, CRITICAL=red |

Use the **Cell content function** in advanced settings:

```javascript
var level = value;
if (level === 'CRITICAL') return '<b style="color:red">⛔ CRITICAL</b>';
if (level === 'WARNING')  return '<b style="color:orange">⚠️ WARNING</b>';
return '<b style="color:green">✅ NORMAL</b>';
```

---

## Step 4: Mobile Alert Setup

If you have a mobile app or want SMS/email alerts:

1. Go to **Rule chains → Root Rule Chain**
2. Add a **Filter node**: `msg.alert_level == "CRITICAL" || msg.alert_level == "WARNING"`
3. Connect to: **Send email / Send SMS / Push notification** action node

---

## Step 5: Save & Share

1. Click **Save** in dashboard editor
2. Go to **Dashboard settings → Make public** (optional, for demo sharing)
3. Copy the public link for judges

---

## Verification Checklist

- [ ] Device `INV_001` shows Latest Telemetry with `hybrid_rul_pct`
- [ ] Radial gauge updates every 2–4 seconds
- [ ] Time-series chart shows trending RUL over time
- [ ] Alarm widget fires when `hybrid_rul_pct` drops below 40
- [ ] Mobile alert device receives simplified alert JSON on trigger
