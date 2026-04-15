import subprocess
import time
import sys

scripts = [
    ["python", "inverter_sim.py"],
    ["python", "modbus_mqtt_bridge.py"],
    ["python", "mqtt_backend.py"]
]

def start_processes():
    procs = []
    print("Starting Inverter Autonomous Pipeline...")
    for cmd in scripts:
        p = subprocess.Popen(cmd)
        procs.append(p)
        time.sleep(2) # Stagger starts
    return procs

if __name__ == "__main__":
    processes = start_processes()
    try:
        while True:
            for i, p in enumerate(processes):
                if p.poll() is not None:
                    print(f"Process {scripts[i][1]} died. Restarting...")
                    processes[i] = subprocess.Popen(scripts[i])
            time.sleep(5)
    except KeyboardInterrupt:
        print("Shutting down system...")
        for p in processes: p.terminate()
