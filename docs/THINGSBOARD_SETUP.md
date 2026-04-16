# ⚙️ ThingsBoard Setup Guide
### A.R.M.S. Ecosystem Configuration

Follow these steps to link your hardware data to the industrial dashboard and prepare it for the judges.

---

## 🏗️ Step 1: Create the IoT Device
1.  **Login**: Access [ThingsBoard Cloud](https://eu.thingsboard.cloud).
2.  **Add Device**: Go to **Entities → Devices** and click the **(+)** button.
3.  **Config**:
    *   Name: `INV_001`
    *   Label: `Industrial Inverter - Unit 01`
4.  **Token**: Open the device details → Click **"Copy Access Token"**. 
    *   *Paste this into your local `.env` file as `THINGSBOARD_ACCESS_TOKEN`.*

---

## 🎨 Step 2: Build the Industrial Dashboard
1.  **Add Dashboard**: Go to **Dashboards**, click **(+)**, and name it `ARMS Control Center`.
2.  **Open & Edit**: Open the dashboard and click the **Pencil icon** (bottom right).
3.  **Create Alias (The "Bridge")**:
    *   Click the **Entity Aliases** icon (top right).
    *   Add Alias named `CurrentInverter`.
    *   Filter Type: `Single Entity`.
    *   Type: `Device` → Select `INV_001`.
4.  **Add Recommended Widgets**:
    *   **Analogue Gauge**: Map to `hybrid_rul_pct`. Set 0-40% to Red, 40-100% to Green.
    *   **Timeseries Line Chart**: Add `temperature` and `inverter_current`.
    *   **Image Map**: Upload the `inverter_relay_schematic.png` and place a marker for `temperature`.

---

## 🌍 Step 3: Enabling Public Access (Professional Edition)
Judges need to view your dashboard without logging in. Follow these steps for ThingsBoard Cloud/PE:

### Method A: Detailed Configuration
1.  On the dashboard list, click **"Dashboard details"**.
2.  Click **"Manage owner and groups"** at the top.
3.  Assign the dashboard to the **"Public"** customer.
4.  **Crucial**: Repeat this for the **Device** (`INV_001`). Go to Device Details → Manage owner and groups → Assign to **Public**.

### Method B: Manage Public Access (If Available)
1.  Click the **Globe (Manage Public Access)** icon on the dashboard card.
2.  Enable **"Make Public"**.
3.  **Copy the Link**: This is what you give to the judges!

---

## ⏱️ Step 4: Real-time Refresh
To ensure the dashboard "lives," click the **Timer icon** at the top of your dashboard and set the "Default Real-time Strategy" to:
*   **Type**: Real-time
*   **Time Window**: Last 5 minutes

---

## ✅ Final Verification
1.  Start your local script: `python go.py`.
2.  Open your **Public Dashboard Link** in a Private/Incognito browser window.
3.  If you see the gauges moving, your system is **Enterprise-Ready**. 🚀
