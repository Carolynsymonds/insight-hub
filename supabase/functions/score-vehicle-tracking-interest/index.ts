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
    const { leadId, domain, company, micsSector } = await req.json();

    console.log("Scoring vehicle tracking interest for:", { leadId, domain, company, micsSector });

    if (!leadId || !domain) {
      throw new Error("leadId and domain are required");
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Based on this domain: ${domain} for company "${company}"${micsSector ? ` in sector "${micsSector}"` : ''}

Tell me how relevant/likely it is that this company would be interested in vehicle tracking solutions.

Consider factors:
- Does the business involve fleet management, deliveries, or mobile services?
- Do they have field workers, home visits, or mobile operations?
- Would vehicle tracking benefit their operations (efficiency, safety, compliance)?
- Industries like healthcare home services, logistics, construction, utilities are high-interest
- Retail stores, purely office-based businesses are low-interest

Provide a score from 0-100 where:
- 90-100: Extremely likely - business model relies heavily on mobile operations
- 70-89: Very likely - significant mobile workforce or fleet operations
- 50-69: Moderately likely - some mobile operations that could benefit
- 30-49: Somewhat likely - limited mobile operations
- 0-29: Unlikely - primarily office-based or no vehicle operations

Consider the actual business operations visible on their website.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_vehicle_tracking_interest",
              description: "Score how likely a company would be interested in vehicle tracking solutions",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Interest likelihood score from 0-100"
                  },
                  explanation: {
                    type: "string",
                    description: "Brief explanation of why they would or wouldn't be interested"
                  }
                },
                required: ["score", "explanation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "score_vehicle_tracking_interest" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    const score = Math.round(result.score);
    const explanation = result.explanation;

    console.log("Parsed result:", { score, explanation });

    // Update database
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        vehicle_tracking_interest_score: score,
        vehicle_tracking_interest_explanation: explanation,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ score, explanation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in score-vehicle-tracking-interest:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
