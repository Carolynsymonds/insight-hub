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
    const { 
      leadId, 
      company,
      description, 
      vehicles_count, 
      confirm_vehicles_50_plus, 
      truck_types, 
      features,
      // New fields for richer context
      company_industry,
      products_services,
      size,
      annual_revenue,
      mics_sector
    } = await req.json();

    if (!leadId) {
      throw new Error("leadId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the enhanced prompt with all available context
    const prompt = `You are a sales intelligence AI creating personalized lead insights for SDRs.

Task: Generate a compelling 4-6 sentence paragraph explaining why this company is likely interested in vehicle tracking. This will be used by sales development representatives for lead qualification and outreach.

Structure your response to cover:
1. FLEET CONTEXT: Start with their fleet size and vehicle types as the opening hook
2. OPERATIONAL CHALLENGES: Connect their industry and operations to specific fleet management pain points (scheduling, costs, coordination, deliveries, compliance)
3. FEATURE FIT: Explain how their selected features address their specific operational needs
4. BUSINESS IMPACT: Tie back to real-world benefits (efficiency gains, cost savings, safety improvements, regulatory compliance)

Writing guidelines:
- Start with the fleet size and vehicle types as the first sentence
- Use confident, professional tone throughout
- Be specific about operational challenges relevant to their industry
- Reference their industry context naturally
- Connect fleet complexity to their business scale when size/revenue data is available
- Do NOT mention forms, submissions, surveys, or that this is AI-generated
- Infer needs naturally as if you understand their business

Company Data:
Company: ${company || "Unknown Company"}
Industry: ${company_industry || "Not specified"}
MICS Sector: ${mics_sector || "Not specified"}
Products/Services: ${products_services || "Not specified"}
Company Size: ${size || "Not specified"}
Annual Revenue: ${annual_revenue || "Not specified"}
Description: ${description || "No description available"}

Fleet Data:
Fleet Size: ${vehicles_count || "Not specified"}
Confirmed 50+ Vehicles: ${confirm_vehicles_50_plus || "Not specified"}
Vehicle Types: ${truck_types || "Not specified"}
Features of Interest: ${features || "Not specified"}

Generate only the paragraph, no headers, labels, or quotes.`;

    console.log("Generating enhanced vehicle tracking interest for lead:", leadId);

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
