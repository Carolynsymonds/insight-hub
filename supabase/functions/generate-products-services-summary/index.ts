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
      products_services,
      description,
      company_industry,
      mics_sector,
      news,
    } = await req.json();

    console.log("Generating products/services summary for lead:", leadId);

    // Check if we have any data to work with
    if (!products_services && !description && !company_industry) {
      return new Response(
        JSON.stringify({ error: "No products/services, description, or industry data available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const contextParts: string[] = [];
    
    if (company) {
      contextParts.push(`Company Name: ${company}`);
    }
    if (products_services) {
      contextParts.push(`Products/Services (primary source): ${products_services}`);
    }
    if (description) {
      contextParts.push(`Company Description: ${description}`);
    }
    if (company_industry) {
      contextParts.push(`Industry: ${company_industry}`);
    }
    if (mics_sector) {
      contextParts.push(`MICS Sector Classification: ${mics_sector}`);
    }
    if (news) {
      contextParts.push(`Recent News (look for product/service mentions): ${news}`);
    }

const prompt = `Based on the following company information, create a clean categorized list of products and services.

${contextParts.join("\n\n")}

FORMAT RULES:
- Each line is a category followed by comma-separated items
- Format: "Category: Item1, Item2, Item3"
- NO paragraphs. NO sentences. NO bullet points.
- NO repetition across categories
- Only include categories where you have actual data
- Maximum 4-5 categories

EXAMPLE OUTPUT:
Facilities: Tennis, Pickleball, Basketball, Tracks, Lacrosse, Soccer
Construction Methods: Post-tensioned concrete, Hydrogrid systems
Surfacing: Latex, Polyurethane, Synthetic Turf, AstroTurf
Services: Fencing, Lighting, Striping, Maintenance

Generate the categorized list now:`;

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
            content: "You output ONLY clean categorized lists. No paragraphs. No sentences. No bullet points. Format: Category: Item1, Item2, Item3",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error("No summary generated from AI");
    }

    console.log("Generated products/services summary:", summary);

    // Update the lead in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ products_services_summary: summary })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error("Failed to save summary to database");
    }

    return new Response(
      JSON.stringify({ products_services_summary: summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating products/services summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
