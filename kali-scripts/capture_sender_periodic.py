#!/usr/bin/env python3
# capture_sender_periodic.py – (Kali → React/Supabase) with periodic aggregation
# Author: Hilmi + ChatGPT
# Purpose: Capture Wi-Fi packets, compute session features, and POST to Supabase edge function

import requests
from scapy.all import sniff, Dot11, RadioTap
from datetime import datetime
from statistics import mean, pstdev
import threading
import time
import json
import os

# ----- CONFIG -----
SUPABASE_URL = "https://zecylmrmutyhibqwnjps.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY3lsbXJtdXR5aGlicXduanBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjMyMTYsImV4cCI6MjA3MzIzOTIxNn0.62a7kDjaHl7Pc8hxHZSGkqDDtAH0VCj-VCUz8Y94LTA"
CAPTURE_IFACE = "wlan0mon"
CAPTURE_WINDOW = 30          # seconds per batch
SEND_INTERVAL = 30           # seconds per send (same as window)
# ------------------

lock = threading.Lock()
packet_buffer = {}  # device_id -> list of packets (RSSI, AP, timestamp)
capture_active = False

def parse_rssi(pkt):
    try:
        if pkt.haslayer(RadioTap):
            r = getattr(pkt.getlayer(RadioTap), "dBm_AntSignal", None)
            if r is not None:
                return int(r)
    except Exception:
        pass
    return None

def handler(pkt):
    if not capture_active:
        return
        
    if not pkt.haslayer(Dot11):
        return
    mac = pkt.addr2
    ap = pkt.addr1
    if not mac or not ap or mac.startswith("ff:"):
        return

    rssi = parse_rssi(pkt)
    ts = time.time()

    # store packet
    with lock:
        if mac not in packet_buffer:
            packet_buffer[mac] = []
        packet_buffer[mac].append({
            "ap": ap,
            "rssi": rssi,
            "timestamp": ts
        })

def send_captures(device_id, records):
    """Send individual captures to edge function for storage"""
    if not records:
        return
    
    # Get the most recent AP and RSSI from the records
    most_recent = records[-1]
    ap_id = most_recent["ap"] if most_recent["ap"] else "DefaultAP"
    rssi = most_recent["rssi"] if most_recent["rssi"] is not None else -99
    
    payload = {
        "device_id": device_id,
        "ap_id": ap_id,
        "rssi": rssi
    }
    
    return payload

def send_to_supabase(payload):
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {SUPABASE_KEY}'
        }
        
        resp = requests.post(f"{SUPABASE_URL}/functions/v1/wifi-capture/capture", json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            print(f"[SEND] OK → {payload['device_id']} (Anomaly: {result.get('anomaly', 'N/A')})")
        else:
            print(f"[SEND] FAIL {resp.status_code}: {resp.text}")
    except Exception as e:
        print("[SEND] Exception:", e)

def periodic_sender():
    """Flush packet_buffer every SEND_INTERVAL seconds when capture is active"""
    while True:
        time.sleep(SEND_INTERVAL)
        if not capture_active:
            continue
            
        with lock:
            if not packet_buffer:
                continue
            print(f"\n[SENDING] Processing {len(packet_buffer)} devices...")
            for device_id, recs in list(packet_buffer.items()):
                payload = send_captures(device_id, recs)
                if payload:
                    send_to_supabase(payload)
            packet_buffer.clear()

def start_capture():
    """Start the capture process"""
    global capture_active
    with lock:
        capture_active = True
        packet_buffer.clear()
    print("[CAPTURE] Started WiFi capture - waiting for packets...")

def stop_capture():
    """Stop the capture process"""
    global capture_active
    with lock:
        capture_active = False
        # Send any remaining data before stopping
        if packet_buffer:
            print(f"[STOP] Sending final {len(packet_buffer)} devices...")
            for device_id, recs in list(packet_buffer.items()):
                payload = send_captures(device_id, recs)
                if payload:
                    send_to_supabase(payload)
            packet_buffer.clear()
    print("[CAPTURE] Stopped WiFi capture")

def cancel_capture():
    """Cancel capture and clear data"""
    global capture_active
    with lock:
        capture_active = False
        packet_buffer.clear()
    print("[CAPTURE] Cancelled WiFi capture - data cleared")

def check_capture_control():
    """Poll database for capture control signal from React app"""
    global capture_active
    try:
        headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/get_capture_control_status",
            headers=headers,
            json={},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                should_capture = data[0].get('should_capture', False)
                
                # React to state changes
                if should_capture and not capture_active:
                    print("[CONTROL] React app requested START")
                    start_capture()
                elif not should_capture and capture_active:
                    print("[CONTROL] React app requested STOP")
                    stop_capture()
                    
    except Exception as e:
        print(f"[CONTROL ERROR] {e}")

def control_monitor():
    """Monitor database every 5 seconds for control signals"""
    while True:
        time.sleep(5)
        check_capture_control()

def main():
    print(f"[INIT] Ready to capture on {CAPTURE_IFACE}")
    print("[CONTROL] Monitoring database for React app signals...")
    print("[INFO] Use the React app buttons to start/stop/cancel capture")
    
    # Start the periodic sender thread
    sender_thread = threading.Thread(target=periodic_sender, daemon=True)
    sender_thread.start()
    
    # Start the database control monitor thread
    control_thread = threading.Thread(target=control_monitor, daemon=True)
    control_thread.start()
    
    try:
        # Start sniffing (capture controlled by global flag)
        sniff(iface=CAPTURE_IFACE, prn=handler, store=0)
    except Exception as e:
        print(f"[ERROR] Sniffing failed: {e}")
        print("Make sure:")
        print("1. Interface wlan0mon exists (run: sudo airmon-ng start wlan0)")
        print("2. You have root privileges (run with sudo)")
        print("3. WiFi adapter supports monitor mode")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("❌ Error: This script requires root privileges")
        print("Run with: sudo python3 capture_sender_periodic.py")
        exit(1)
    
    main()
