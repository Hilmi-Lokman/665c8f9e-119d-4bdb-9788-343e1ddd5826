import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { anomalyScore, apSwitches, avgRssi, durationSeconds, deviceId, matricNumber, studentName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a WiFi attendance monitoring security analyst. Analyze anomaly patterns and provide clear, concise explanations for detected suspicious behavior. Focus on the security implications and what the pattern indicates about potential attendance fraud or system abuse.`;

    const userPrompt = `Analyze this attendance anomaly:
- Anomaly Score: ${anomalyScore}
- AP Switches: ${apSwitches}
- Average RSSI: ${avgRssi} dBm
- Session Duration: ${Math.floor(durationSeconds / 60)} minutes
- Device ID: ${deviceId}
- Student: ${studentName} (${matricNumber || 'Not registered'})

Provide:
1. A brief description (max 100 chars) of what this anomaly indicates
2. A detailed suspicious pattern analysis (2-3 specific bullet points about what makes this suspicious)

Format as JSON:
{
  "description": "brief description here",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_anomaly",
              description: "Analyze attendance anomaly and return structured explanation",
              parameters: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                    description: "Brief description of the anomaly (max 100 characters)"
                  },
                  patterns: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "List of 2-3 specific suspicious patterns detected"
                  }
                },
                required: ["description", "patterns"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_anomaly" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI Gateway request failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No analysis returned from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-anomaly function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        // Fallback to simple analysis
        description: "Unusual network behavior detected",
        patterns: ["Unable to generate detailed analysis"]
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
