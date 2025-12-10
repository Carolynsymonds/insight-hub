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

    const prompt = `Based on the following company information, generate a professional Products & Services summary paragraph.

${contextParts.join("\n\n")}

STRUCTURE YOUR RESPONSE TO COVER:
1. Core Offerings - What the company sells or delivers (primary focus)
2. Specialties/Expertise - What differentiates them from competitors
3. Customer Segment (if apparent) - Who they serve (businesses, consumers, government, specific industries)
4. Notable Capabilities or Technology (if mentioned) - Any special capabilities, methods, or technologies

RULES:
- Write a single cohesive paragraph (3-5 sentences)
- Start with "Products & Services:" followed by the paragraph
- Be specific and factual based on the provided data
- If the company offers multiple services, organize them logically
- Mention any specializations or unique offerings
- Do NOT invent or assume services not mentioned in the source data
- Write in third person, professional tone

Example format:
Products & Services: [Company] provides [core offerings], specializing in [specialties]. Their services include [specific offerings]. They serve [customer segment] with [notable capabilities/technology if applicable].`;

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
            content: "You are a professional business analyst who writes clear, accurate product and service descriptions based on provided company data. You never invent information not present in the source data.",
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
