import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureData {
  device_id?: string;
  ap_id?: string;
  rssi?: number;
  // Feature test fields
  duration_total?: number;
  ap_switches?: number;
  frag_count?: number;
  bytes_total?: number;
  rssi_mean?: number;
  rssi_std?: number;
  invalid_rssi_count?: number;
  login_hour?: number;
  weekday?: number;
  start_minute_of_day?: number;
}

interface ProcessedRecord {
  device_id: string;
  device_hash: string;
  ap_id: string;
  avg_rssi: number;
  rssi_std: number;
  duration_seconds: number;
  ap_switches: number;
  anomaly_flag: boolean;
  anomaly_score: number;
  first_seen: string;
  last_seen: string;
  sample_count: number;
}

// Hash MAC address
function hashMac(mac: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(mac);
  const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Python microservice URL for ONNX model inference
const ANOMALY_SERVICE_URL = Deno.env.get('ANOMALY_SERVICE_URL') || 'http://localhost:5000';

// Call Python microservice for anomaly detection
async function detectAnomaly(features: {
  duration_total: number;
  ap_switches: number;
  frag_count: number;
  bytes_total: number;
  rssi_mean: number;
  rssi_std: number;
  invalid_rssi_count: number;
  login_hour: number;
  weekday: number;
  start_minute_of_day: number;
}): Promise<{ anomaly: boolean; score: number }> {
  try {
    console.log('[Anomaly Service] Calling:', ANOMALY_SERVICE_URL);
    console.log('[Anomaly Service] Features:', features);
    
    const response = await fetch(`${ANOMALY_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(features),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Anomaly Service] Error:', response.status, errorText);
      throw new Error(`Anomaly service returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[Anomaly Service] Response:', result);
    
    // result.is_anomaly: 1 = anomaly, 0 = normal
    // result.anomaly_score: negative score from Isolation Forest
    const isAnomaly = result.is_anomaly === 1;
    const normalizedScore = Math.min(1, Math.max(0, Math.abs(result.anomaly_score)));
    
    return {
      anomaly: isAnomaly,
      score: normalizedScore
    };
  } catch (error) {
    console.error('[Anomaly Service] Detection failed:', error);
    // Fallback to non-anomalous on service error
    return { anomaly: false, score: 0.5 };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    console.log(`[WiFi Capture] Action: ${action}`);

    // ========== CAPTURE ENDPOINT ==========
    if (action === 'capture' && req.method === 'POST') {
      const data: CaptureData = await req.json();

      // CASE 1: Feature test (no device_id)
      if (!data.device_id && data.duration_total !== undefined) {
        console.log('[capture] Feature test detected');
        
        const features = {
          duration_total: data.duration_total!,
          ap_switches: data.ap_switches || 0,
          frag_count: data.frag_count || 0,
          bytes_total: data.bytes_total || 0,
          rssi_mean: data.rssi_mean || -99,
          rssi_std: data.rssi_std || 0,
          invalid_rssi_count: data.invalid_rssi_count || 0,
          login_hour: data.login_hour || 0,
          weekday: data.weekday || 0,
          start_minute_of_day: data.start_minute_of_day || 0,
        };

        const result = await detectAnomaly(features);

        return new Response(
          JSON.stringify({
            message: 'Feature test completed',
            anomaly: result.anomaly ? 1 : 0,
            score: result.score,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CASE 2: Real WiFi capture
      if (data.device_id) {
        const timestamp = new Date().toISOString();

        // Store in periodic_captures table (temporary storage)
        const { error: insertError } = await supabaseClient
          .from('periodic_captures')
          .insert({
            device_id: data.device_id,
            ap_id: data.ap_id || 'DefaultAP',
            rssi: data.rssi || -99,
            timestamp,
          });

        if (insertError) {
          console.error('[capture] Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[capture] Stored capture for ${data.device_id}`);

        return new Response(
          JSON.stringify({ message: 'Capture recorded', device_id: data.device_id }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid capture data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== PROCESS ENDPOINT ==========
    if (action === 'process' && req.method === 'POST') {
      console.log('[process] Aggregating and processing captures...');

      // Get current time info for schedule detection
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      console.log(`[process] Current day: ${dayOfWeek}, time: ${currentTime}`);

      // Fetch active schedule for current time
      const { data: activeSchedules, error: schedError } = await supabaseClient
        .from('schedules')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .lte('time_start', currentTime)
        .gte('time_end', currentTime);

      if (schedError) {
        console.error('[process] Error fetching schedules:', schedError);
      }

      const activeSchedule = activeSchedules && activeSchedules.length > 0 ? activeSchedules[0] : null;
      console.log('[process] Active schedule:', activeSchedule ? `${activeSchedule.subject_name} (${activeSchedule.duration_minutes} min)` : 'None');

      // Fetch all periodic captures
      const { data: captures, error: fetchError } = await supabaseClient
        .from('periodic_captures')
        .select('*')
        .order('timestamp', { ascending: true });

      if (fetchError) {
        console.error('[process] Fetch error:', fetchError);
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!captures || captures.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No captures to process' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Group by device_id and ap_id
      const grouped = new Map<string, any[]>();
      for (const capture of captures) {
        const key = `${capture.device_id}_${capture.ap_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(capture);
      }

      // Fetch all registered devices for lookup
      const { data: registeredDevices, error: regError } = await supabaseClient
        .from('registered_devices')
        .select('device_id, student_name, matric_number, class_name, device_hash');
      
      if (regError) {
        console.error('[process] Error fetching registered devices:', regError);
      }

      // Create a lookup map for registered devices
      const deviceLookup = new Map(
        registeredDevices?.map(d => [d.device_id, d]) || []
      );

      const processedRecords: ProcessedRecord[] = [];

      // Process each group
      for (const [key, group] of grouped.entries()) {
        const first = group[0];
        const last = group[group.length - 1];
        
        const firstSeen = new Date(group[0].timestamp);
        const lastSeen = new Date(group[group.length - 1].timestamp);
        const duration = (lastSeen.getTime() - firstSeen.getTime()) / 1000;

        const rssiValues = group.map(g => g.rssi || -99);
        const avgRssi = rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
        const rssiStd = Math.sqrt(
          rssiValues.reduce((sum, val) => sum + Math.pow(val - avgRssi, 2), 0) / rssiValues.length
        );

        // Run ONNX anomaly detection
        const features = {
          duration_total: duration,
          ap_switches: 0, // We don't track AP switches in this simplified version
          frag_count: group.length, // Use sample count as fragment count
          bytes_total: 0, // Not tracked yet
          rssi_mean: avgRssi,
          rssi_std: rssiStd,
          invalid_rssi_count: Math.max(0, 10 - group.length),
          login_hour: firstSeen.getHours(),
          weekday: firstSeen.getDay(),
          start_minute_of_day: firstSeen.getHours() * 60 + firstSeen.getMinutes(),
        };

        const aiResult = await detectAnomaly(features);

        processedRecords.push({
          device_id: first.device_id,
          device_hash: hashMac(first.device_id),
          ap_id: first.ap_id,
          avg_rssi: avgRssi,
          rssi_std: rssiStd,
          duration_seconds: Math.floor(duration),
          ap_switches: 0,
          anomaly_flag: aiResult.anomaly,
          anomaly_score: aiResult.score,
          first_seen: firstSeen.toISOString(),
          last_seen: lastSeen.toISOString(),
          sample_count: group.length,
        });
      }

      // Insert processed records into attendance_records
      const attendanceRecords = processedRecords.map(record => {
        // Calculate attendance duration in minutes
        const attendanceDurationMinutes = Math.floor(record.duration_seconds / 60);
        
        // Determine if absent based on schedule
        let isAbsent = false;
        let status = record.anomaly_flag ? 'flagged' : 'present';
        
        if (activeSchedule) {
          const requiredMinutes = activeSchedule.duration_minutes;
          // Mark as absent if attendance time is less than class duration
          if (attendanceDurationMinutes < requiredMinutes) {
            isAbsent = true;
            status = 'absent';
            console.log(`[process] Device ${record.device_id}: marked ABSENT (${attendanceDurationMinutes}/${requiredMinutes} min)`);
          } else {
            console.log(`[process] Device ${record.device_id}: marked PRESENT (${attendanceDurationMinutes}/${requiredMinutes} min)`);
          }
        }
        
        // Lookup registered device information
        const registeredDevice = deviceLookup.get(record.device_id);
        
        console.log(`[process] Device ${record.device_id}: anomaly=${record.anomaly_flag}, score=${record.anomaly_score}, status=${status}, registered=${!!registeredDevice}`);
        
        return {
          device_id: record.device_id,
          device_hash: record.device_hash,
          ap_id: record.ap_id,
          avg_rssi: record.avg_rssi,
          rssi_std: record.rssi_std,
          duration_seconds: record.duration_seconds,
          ap_switches: record.ap_switches,
          anomaly_flag: record.anomaly_flag,
          anomaly_score: record.anomaly_score,
          status: status,
          session_duration: `${Math.floor(record.duration_seconds / 60)}m ${record.duration_seconds % 60}s`,
          student_name: registeredDevice?.student_name || null,
          matric_number: registeredDevice?.matric_number || null,
          class_name: registeredDevice?.class_name || null,
          schedule_id: activeSchedule?.id || null,
          attendance_duration_minutes: attendanceDurationMinutes,
          is_absent: isAbsent,
        };
      });

      const { error: insertError } = await supabaseClient
        .from('attendance_records')
        .insert(attendanceRecords);

      if (insertError) {
        console.error('[process] Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear periodic captures
      const { error: deleteError } = await supabaseClient
        .from('periodic_captures')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('[process] Delete error:', deleteError);
      }

      console.log(`[process] Processed ${processedRecords.length} records`);

      return new Response(
        JSON.stringify({ 
          message: `Processed ${processedRecords.length} records`,
          records: processedRecords.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== STATUS ENDPOINT ==========
    if (action === 'status' && req.method === 'GET') {
      const { count } = await supabaseClient
        .from('periodic_captures')
        .select('*', { count: 'exact', head: true });

      return new Response(
        JSON.stringify({ 
          running: (count || 0) > 0,
          pending_captures: count || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WiFi Capture] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
