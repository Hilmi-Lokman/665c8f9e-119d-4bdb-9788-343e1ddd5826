#!/usr/bin/env python3
# capture_sender.py – (Kali → React/Supabase) with periodic aggregation
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
from dotenv import load_dotenv

# Load env
load_dotenv()

# ----- CONFIG (from .env) -----
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zecylmrmutyhibqwnjps.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
CAPTURE_IFACE = os.getenv("CAPTURE_IFACE", "wlan0mon")
CAPTURE_WINDOW = int(os.getenv("CAPTURE_WINDOW", "30"))   # seconds per batch
SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "30"))     # seconds per send (same as window)
CONTROL_POLL_INTERVAL = int(os.getenv("CONTROL_POLL_INTERVAL", "5"))  # seconds
# ------------------

if not SUPABASE_KEY:
    raise SystemExit("[ERROR] SUPABASE_KEY not set. Add to .env")

lock = threading.Lock()
packet_buffer = {}  # device_id -> list of packets (RSSI, AP, timestamp)
capture_active = False
network_error_logged = False

def parse_rssi(pkt):
    """Parse RSSI from packet - try multiple methods with fallbacks"""
    try:
        if pkt.haslayer(RadioTap):
            radiotap = pkt.getlayer(RadioTap)
            
            # Method 1: Try dBm_AntSignal (most common)
            rssi = getattr(radiotap, "dBm_AntSignal", None)
            if rssi is not None:
                return int(rssi)
            
            # Method 2: Try lowercase variant
            rssi = getattr(radiotap, "dbm_antsignal", None)
            if rssi is not None:
                return int(rssi)
            
            # Method 3: Try Antenna_signal attribute
            rssi = getattr(radiotap, "Antenna_signal", None)
            if rssi is not None:
                return int(rssi)
            
            # Method 4: Try parsing notdecoded field (last byte often contains RSSI)
            if hasattr(radiotap, "notdecoded") and radiotap.notdecoded:
                try:
                    # Last byte of notdecoded sometimes contains RSSI
                    rssi_byte = radiotap.notdecoded[-1]
                    if isinstance(rssi_byte, int):
                        # Convert unsigned byte to signed dBm (-128 to 0)
                        rssi_value = rssi_byte if rssi_byte < 128 else rssi_byte - 256
                        if -100 <= rssi_value <= 0:  # Sanity check for valid RSSI range
                            if not hasattr(parse_rssi, '_notdecoded_success'):
                                print(f"[INFO] Using fallback RSSI from RadioTap.notdecoded")
                                parse_rssi._notdecoded_success = True
                            return rssi_value
                except Exception:
                    pass
                
            # Debug: Print available attributes once
            if not hasattr(parse_rssi, '_debug_printed'):
                print(f"\n[DEBUG] RadioTap attributes: {[a for a in dir(radiotap) if not a.startswith('_')]}")
                print(f"[DEBUG] RadioTap.present: {getattr(radiotap, 'present', 'N/A')}")
                print(f"[DEBUG] RadioTap.notdecoded length: {len(radiotap.notdecoded) if hasattr(radiotap, 'notdecoded') else 'N/A'}")
                if hasattr(radiotap, 'notdecoded') and radiotap.notdecoded:
                    print(f"[DEBUG] RadioTap.notdecoded bytes: {[hex(b) for b in radiotap.notdecoded[:10]]}")
                parse_rssi._debug_printed = True
        else:
            # Debug: Print packet structure once
            if not hasattr(parse_rssi, '_no_radiotap_printed'):
                print(f"\n[DEBUG] No RadioTap layer! Packet layers: {pkt.layers()}")
                print(f"[DEBUG] Packet summary: {pkt.summary()}")
                parse_rssi._no_radiotap_printed = True
                
    except Exception as e:
        if not hasattr(parse_rssi, '_error_printed'):
            print(f"[DEBUG] RSSI parse error: {e}")
            parse_rssi._error_printed = True
    
    return None

def handler(pkt):
    # handler runs for every packet sniffed; only buffer when capture_active True
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

def summarize_session(device_id, records):
    """Compute features used by AI model"""
    if not records:
        return None
    timestamps = [r["timestamp"] for r in records]
    duration_total = max(timestamps) - min(timestamps)
    ap_switches = len(set(r["ap"] for r in records))
    rssi_values = [r["rssi"] for r in records if r["rssi"] is not None]
    rssi_mean = mean(rssi_values) if rssi_values else -99
    rssi_std = pstdev(rssi_values) if len(rssi_values) > 1 else 0
    invalid_rssi_count = len([r for r in records if r["rssi"] is None])

    now = datetime.now()
    payload = {
        "device_id": device_id,
        "duration_total": round(duration_total, 2),
        "ap_switches": ap_switches,
        "frag_count": len(records),
        "bytes_total": 0,
        "rssi_mean": round(rssi_mean, 2),
        "rssi_std": round(rssi_std, 2),
        "invalid_rssi_count": invalid_rssi_count,
        "login_hour": now.hour,
        "weekday": now.weekday(),
        "start_minute_of_day": now.hour * 60 + now.minute
    }
    return payload

def send_to_supabase(payload):
    """
    Sends summary payload to the Supabase Edge Function 'wifi-capture' -> 'capture' path.
    If you prefer to insert into a REST table, replace the URL and body as needed.
    """
    try:
        headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        }

        # Edge function endpoint - change if you use a table or different function name
        url = SUPABASE_URL.rstrip('/') + "/functions/v1/wifi-capture/capture"

        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code in (200, 201):
            try:
                result = resp.json()
            except Exception:
                result = {"status": "ok"}
            print(f"[SEND] OK → {payload['device_id']} (Response: {result})")
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
            print(f"\n[AGGREGATE] Processing {len(packet_buffer)} devices...")
            for device_id, recs in list(packet_buffer.items()):
                features = summarize_session(device_id, recs)
                if features:
                    send_to_supabase(features)
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
                features = summarize_session(device_id, recs)
                if features:
                    send_to_supabase(features)
            packet_buffer.clear()
    print("[CAPTURE] Stopped WiFi capture")

def cancel_capture():
    """Cancel capture and clear data"""
    global capture_active
    with lock:
        capture_active = False
        packet_buffer.clear()
    print("[CAPTURE] Cancelled WiFi capture - data cleared")

# --- Control watcher: polls Supabase control RPC and triggers start/stop ---
def get_capture_status_from_supabase():
    global network_error_logged
    try:
        headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        }
        resp = requests.post(
            SUPABASE_URL.rstrip('/') + "/rest/v1/rpc/get_capture_control_status",
            headers=headers,
            timeout=5
        )
        
        # Reset error flag on successful connection
        if network_error_logged:
            print("[CONTROL] ✓ Network connection restored")
            network_error_logged = False
            
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                # expects [{ "should_capture": true/false, "updated_at": "..."}]
                return bool(data[0].get("should_capture", False))
        else:
            print("[CONTROL] RPC error:", resp.status_code, resp.text)
    except requests.exceptions.RequestException as e:
        # Only log network errors once to avoid console spam
        if not network_error_logged:
            print(f"[CONTROL] ⚠ Network unavailable - waiting for connection...")
            print(f"[CONTROL] (Check VM network settings if this persists)")
            network_error_logged = True
    except Exception as e:
        print("[CONTROL] Unexpected error:", e)
    return False

def control_watcher():
    """Background thread that checks Supabase flag periodically"""
    global capture_active
    last_state = None
    print("[CONTROL] Monitoring database for React app signals...")
    while True:
        state = get_capture_status_from_supabase()
        if last_state is None:
            last_state = state
            # set local capture to match cloud flag on startup
            if state and not capture_active:
                print("[CONTROL] React app requested START")
                start_capture()
            elif not state and capture_active:
                print("[CONTROL] React app requested STOP")
                stop_capture()
        else:
            if state != last_state:
                print(f"[CONTROL] Remote flag changed: {last_state} -> {state}")
                last_state = state
                if state:
                    print("[CONTROL] React app requested START")
                    start_capture()
                else:
                    print("[CONTROL] React app requested STOP")
                    stop_capture()
        time.sleep(CONTROL_POLL_INTERVAL)

def main():
    print(f"[INIT] Ready to capture on {CAPTURE_IFACE}")
    print("[INFO] Use the React app buttons to start/stop/cancel capture")

    # Start the control watcher thread
    watcher_thread = threading.Thread(target=control_watcher, daemon=True)
    watcher_thread.start()

    # Start the sender/aggregation thread
    sender_thread = threading.Thread(target=periodic_sender, daemon=True)
    sender_thread.start()
    
    try:
        # Start sniffing (handler checks capture_active flag)
        sniff(iface=CAPTURE_IFACE, prn=handler, store=0)
    except Exception as e:
        print(f"[ERROR] Sniffing failed: {e}")
        print("Make sure:")
        print("1. Interface wlan0mon exists (run: sudo airmon-ng start wlan0)")
        print("2. You have root privileges (run with sudo)")
        print("3. WiFi adapter supports monitor mode")

# Command line controls for testing
if __name__ == "__main__":
    if os.geteuid() != 0:
        print("❌ Error: This script requires root privileges")
        print("Run with: sudo python3 capture_sender.py")
        exit(1)
        
    # For testing from command line
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "start":
            start_capture()
            exit(0)
        elif sys.argv[1] == "stop":
            stop_capture()
            exit(0)
        elif sys.argv[1] == "cancel":
            cancel_capture()
            exit(0)
        else:
            print("Usage: sudo python3 capture_sender.py [start|stop|cancel]")
            exit(1)
    
    main()
