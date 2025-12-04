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
    const { leadId, description, vehicles_count, confirm_vehicles_50_plus, truck_types, features, company } = await req.json();

    if (!leadId) {
      throw new Error("leadId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt with lead data
    const prompt = `You are an AI enrichment system.
You will receive:
- A company description
- The lead's selected form inputs (vehicle count, vehicle type, features, confirm vehicles)

Task:
Generate a concise paragraph explaining why this company is likely interested in vehicle tracking, grounding your reasoning in the company's industry, operations, and the selected options.
Your explanation should clearly connect the operational challenges implied by the company description with the features chosen.

Instructions:
- Explicitly reference the fleet size and vehicle type.
- Use the selected feature(s) to infer the company's operational needs.
- Tie the reasoning back to their day-to-day workflows.
- Write in a confident, professional tone.
- Do not mention the form or that the user submitted these answers — infer naturally.
- Keep the paragraph concise (2-4 sentences).

Data:
Company: ${company || "Unknown Company"}
Company Description: ${description || "No description available"}
Vehicle Count: ${vehicles_count || "Not specified"}
Confirmed 50+ Vehicles: ${confirm_vehicles_50_plus || "Not specified"}
Vehicle Types: ${truck_types || "Not specified"}
Features of Interest: ${features || "Not specified"}

Generate only the paragraph, no headers or labels.`;

    console.log("Generating vehicle tracking interest explanation for lead:", leadId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limits exceeded, please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required, please add funds to your Lovable AI workspace.");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content?.trim();

    if (!explanation) {
      throw new Error("No explanation generated from AI");
    }

    console.log("Generated explanation:", explanation);

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        vehicle_tracking_interest_explanation: explanation,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to save explanation: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        explanation 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-vehicle-interest:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
