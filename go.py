import subprocess
import time
import sys

scripts = [
    {"cmd": ["python", "inverter_sim.py"], "cwd": "backend"},
    {"cmd": ["python", "modbus_mqtt_bridge.py"], "cwd": "backend"}
]

def start_processes():
    procs = []
    print("🚀 Starting A.R.M.S. Unified Pipeline...")
    for item in scripts:
        p = subprocess.Popen(item["cmd"], cwd=item["cwd"])
        procs.append(p)
        time.sleep(2) # Stagger starts
    return procs

if __name__ == "__main__":
    processes = start_processes()
    try:
        while True:
            for i, p in enumerate(processes):
                if p.poll() is not None:
                    print(f"Process {scripts[i]['cmd'][1]} died. Restarting...")
                    processes[i] = subprocess.Popen(scripts[i]["cmd"], cwd=scripts[i]["cwd"])
            time.sleep(5)
    except KeyboardInterrupt:
        print("Shutting down system...")
        for p in processes: p.terminate()
