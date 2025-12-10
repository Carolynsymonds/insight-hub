import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      leadId, 
      company, 
      description, 
      company_industry, 
      products_services,
      vehicles_count, 
      truck_types, 
      features 
    } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating business cases for lead ${leadId}:`, {
      company,
      company_industry,
      vehicles_count,
      truck_types,
      features,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt
    const prompt = `You are an AI enrichment system.
Using the company information below — including industry, description, products/services, fleet size, truck types, and selected features — generate a Likely Business Cases section.

Your output must follow this structure:

Start with one sentence contextualising the business, using the company's core operations + fleet details.
Format: "Given their work in {industry/description}, and a fleet of {Vehicles Count} {Truck Types}, {Company Name} is likely seeking vehicle tracking to support several operational needs."

Then provide 5 bullet points using these business cases (adapt emphasis based on selected features):
• Coordinating trucks/equipment across worksites
• Reducing delays + fuel/operational costs
• Protecting heavy-duty assets
• Improving scheduling + ETA accuracy
• Increasing fleet visibility and driver accountability

Where appropriate, adapt the emphasis based on the selected feature set (e.g., Real-time GPS, Fuel Monitoring, Route Optimisation, ELD, etc.).

Inputs:
Company Name: ${company || "Unknown Company"}
Industry: ${company_industry || "Not specified"}
Description: ${description || "Not available"}
Products/Services: ${products_services || "Not specified"}
Vehicles Count: ${vehicles_count || "Not specified"}
Truck Types: ${truck_types || "Not specified"}
Features Needed: ${features || "Not specified"}

Output:
A short paragraph (1-2 sentences) + the 5 bullet points above, tailored to the company. Use bullet points with • character.`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a B2B sales intelligence assistant that generates professional, tailored business case analyses for fleet management and vehicle tracking solutions. Keep responses concise and actionable.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const businessCases = aiResponse.choices?.[0]?.message?.content;

    if (!businessCases) {
      throw new Error("No response from AI model");
    }

    console.log("Generated business cases:", businessCases.substring(0, 200) + "...");

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ likely_business_cases: businessCases })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to save business cases: ${updateError.message}`);
    }

    console.log(`Successfully saved business cases for lead ${leadId}`);

    return new Response(
      JSON.stringify({ success: true, businessCases }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating business cases:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
