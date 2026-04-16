# 🚀 A.R.M.S. (Autonomous Reliability Management System)
### *Predicting the Pulse of Industrial Power*
**Luminous APOGEE '26 Hackathon Special Edition**

> "We don't just monitor failures; we predict the mechanical heartbeat of the grid."

---

## 🌟 The Vision
In the world of industrial power, a single relay failure isn't just a technical glitch—it's a multi-million dollar blackout waiting to happen. **A.R.M.S.** is an autonomous ecosystem designed to bridge the gap between "dumb" hardware and "intelligent" maintenance. 

By combining **Deterministic Physics** with **Non-Linear Machine Learning**, A.R.M.S. provides an Early Warning System that detects microscopic degradation in inverter relays months before they reach a breaking point.

---

## 🔗 Live Ecosystem Links
| Platform | Access Link | Description |
|----------|-------------|-------------|
| **Mobile PWA** | [armsinv.vercel.app](https://armsinv.vercel.app/) | Our premium, mission-control interface for field engineers. |
| **Industrial Dashboard** | [ThingsBoard Live](https://eu.thingsboard.cloud/dashboard/d8776a50-3969-11f1-971b-83c0a6dd70cf?publicId=756172b0-397a-11f1-92f7-cbbd42e0f134) | The primary industrial SCADA view for real-time fleet monitoring. |

---

## 🏗️ System Architecture
The pipeline is built for zero-latency "Edge Intelligence."

1.  **The Pulse (Simulator)**: A physics-accurate Modbus TCP engine simulating inverter transients.
2.  **The Nerve (Unified Bridge)**: An edge-computing gateway that polls raw registers and performs high-speed feature engineering.
3.  **The Brain (Hybrid AI)**: An integrated RUL (Remaining Useful Life) engine that fuses Arrhenius physics with LSTM-based ML confidence.
4.  **The Command (PWA/SCADA)**: Dual-stream visualization for both enterprise and mobile-first field inspection.

---

## 📁 Repository Map
*   📂 **`/backend`**: The Python motor. Contains the Inverter Simulator, the AI-integrated Edge Bridge, and the pre-trained ML models.
*   📂 **`/pwa-dashboard`**: A high-performance Next.js application designed for sub-second telemetry visualization via WebSockets.
*   📂 **`/docs`**: Detailed setup guides for ThingsBoard and system registers.
*   📂 **`/assets`**: High-tech schematics and UI components used for the Digital Twin mapping.

---

## ✨ Why A.R.M.S.? (The Technical Edge)
*   **Physics-First Initialization**: Our models are accurate on **Day 1**. We use mechanical formulas to understand the baseline before the first data point is even recorded.
*   **Arc Energy Mapping**: We go beyond raw temperature. The system calculates the specific arcing energy per switch to identify "invisible" thermal fatigue.
*   **Autonomous Demo Mode**: Switching to Demo Mode in the PWA generates a high-fidelity high-frequency simulation, perfect for demonstrating the UI's responsiveness in any environment.

---

## 🛠️ Developer Quick Start
```powershell
# 1. Start the Pulse & Brain
python go.py

# 2. View the Future
# Open your browser to the PWA or ThingsBoard link above!
```

---

## 🛡️ Contributors
Built with precision for **APOGEE '26** by Arjun Bora & Team.
