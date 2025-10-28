import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Attendance Report] Fetching records from Supabase...');

    const { data: records, error } = await supabaseClient
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Attendance Report] Supabase error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Attendance Report] Found ${records?.length || 0} records`);

    // Transform to match frontend format
    const transformedRecords = (records || []).map(record => {
      // Ensure status matches anomaly_flag for consistency
      const status = record.anomaly_flag ? 'flagged' : (record.status || 'present');
      
      console.log(`[Report] ID=${record.id}: anomaly_flag=${record.anomaly_flag}, db_status=${record.status}, final_status=${status}, score=${record.anomaly_score}`);
      
      return {
        id: record.id,
        studentName: record.student_name || 'Unknown',
        matricNumber: record.matric_number || 'N/A',
        macAddress: record.device_id,
        timestamp: record.created_at,
        className: record.class_name || 'General',
        anomalyFlag: record.anomaly_flag,
        anomalyScore: record.anomaly_score,
        sessionDuration: record.session_duration || `${Math.floor(record.duration_seconds / 60)}m`,
        apSwitches: record.ap_switches,
        rssi: record.avg_rssi,
        status: status
      };
    });

    return new Response(
      JSON.stringify({ data: transformedRecords }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Attendance Report] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
