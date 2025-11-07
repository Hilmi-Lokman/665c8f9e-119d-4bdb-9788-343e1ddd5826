import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the active model configuration
    const { data: modelConfig, error: configError } = await supabase
      .from('ai_model_config')
      .select('*')
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (configError) {
      console.error("Error fetching model config:", configError);
      return new Response(
        JSON.stringify({ error: "No active model found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signed URLs for downloading the files (valid for 1 hour)
    const { data: modelUrl } = await supabase.storage
      .from('ai-models')
      .createSignedUrl(modelConfig.model_file_path, 3600);

    const { data: scalerUrl } = await supabase.storage
      .from('ai-models')
      .createSignedUrl(modelConfig.scaler_file_path, 3600);

    return new Response(
      JSON.stringify({
        version: modelConfig.version,
        uploaded_at: modelConfig.uploaded_at,
        model_url: modelUrl?.signedUrl,
        scaler_url: scalerUrl?.signedUrl,
        notes: modelConfig.notes
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-active-model function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
