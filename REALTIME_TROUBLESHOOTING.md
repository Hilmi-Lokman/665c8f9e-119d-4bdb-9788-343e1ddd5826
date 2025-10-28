# Real-time Attendance Monitor Troubleshooting Guide

## Issue: Data not showing in Real-time Monitor during capture

### Step 1: Enable Real-time in Database

Real-time subscriptions must be enabled in your Lovable Cloud database.

**Run these SQL commands in Cloud → Database → SQL Editor:**

```sql
-- Enable realtime for periodic_captures table
ALTER TABLE periodic_captures REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE periodic_captures;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

You should see `periodic_captures` in the results.

### Step 2: Verify Kali Script is Sending Data

Check if the Kali script is running and sending data:

**On Kali machine:**
```bash
# Check if script is running
ps aux | grep capture_sender_periodic.py

# Check script logs
tail -f /var/log/wifi_capture.log  # or wherever your logs are
```

**Expected output:**
```
[INFO] Capture active: True
[INFO] Sending data to Supabase...
[INFO] Response: 201
```

### Step 3: Test Edge Function Directly

Test if the edge function is receiving and storing data:

**Send test data via curl:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/wifi-capture/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "device_id": "test:mac:address:12:34:56",
    "ap_id": "TestAP",
    "rssi": -65
  }'
```

**Check the database:**
```sql
-- In Cloud → Database → Table Editor or SQL Editor
SELECT * FROM periodic_captures ORDER BY timestamp DESC LIMIT 10;
```

If you see the test record, the edge function works!

### Step 4: Check Browser Console

Open browser DevTools (F12) and look for:

```
[RealtimeMonitor] ✅ Successfully subscribed to periodic_captures
[RealtimeMonitor] Waiting for data...
```

If you see:
```
[RealtimeMonitor] ❌ Real-time may not be enabled!
```

Go back to **Step 1** and run the SQL commands.

### Step 5: Verify Capture is Running

In the app:
1. Click "Start Capture" button
2. Check that status shows "Running"
3. Badge should be green and pulsing
4. Look for console log: `[RealtimeMonitor] Setting up realtime subscription...`

### Step 6: Check Real-time Connection

**In browser console, test the subscription manually:**
```javascript
import { supabase } from '@/integrations/supabase/client';

const channel = supabase
  .channel('test-channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'periodic_captures' },
    (payload) => console.log('GOT DATA:', payload)
  )
  .subscribe((status) => console.log('STATUS:', status));
```

### Common Issues

**1. "CHANNEL_ERROR" status**
- Real-time not enabled → Run SQL commands from Step 1

**2. "SUBSCRIBED" but no data**
- Kali script not running → Check Step 2
- Data not being inserted → Check Step 3
- Check if `periodic_captures` table exists

**3. Subscription closes immediately**
- Component re-rendering → Check React DevTools
- `isLive` prop toggling → Check CaptureControls state

**4. "Backend Connection Failed" toast**
- Flask server on Kali not running
- Network/firewall blocking connection
- Check Kali IP address in api.ts

### Still Not Working?

**Check these in order:**

1. ✅ Real-time enabled (Step 1)
2. ✅ Table exists: `periodic_captures`
3. ✅ Kali script running
4. ✅ Edge function responding (test with curl)
5. ✅ Capture state = "running"
6. ✅ Browser console shows "SUBSCRIBED"

**Manual insert test:**
```sql
-- Insert test row in SQL Editor
INSERT INTO periodic_captures (device_id, ap_id, rssi, timestamp)
VALUES ('manual:test:device', 'TestAP', -70, NOW());
```

If this shows up in the UI immediately, real-time works! The issue is with data collection.

---

## Quick Checklist

- [ ] Ran `ALTER TABLE periodic_captures REPLICA IDENTITY FULL;`
- [ ] Ran `ALTER PUBLICATION supabase_realtime ADD TABLE periodic_captures;`
- [ ] Verified table in publication: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
- [ ] Kali script running: `ps aux | grep capture_sender`
- [ ] Clicked "Start Capture" in UI
- [ ] Status shows "Running" with green badge
- [ ] Browser console shows "SUBSCRIBED"
- [ ] Tested manual insert in database
