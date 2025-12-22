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
      company_industry,
      mics_sector,
      products_services,
      size,
      annual_revenue,
      founded_date,
      zipcode,
      dma,
      domain,
      linkedin,
      facebook,
      instagram,
      news,
    } = await req.json();

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build context sections
    const coreIdentity = [
      company ? `Company: ${company}` : null,
      company_industry ? `Industry: ${company_industry}` : null,
      mics_sector ? `Sector: ${mics_sector}` : null,
      products_services ? `Products/Services: ${products_services}` : null,
    ].filter(Boolean).join("\n");

    const businessScale = [
      size ? `Size: ${size} employees` : null,
      annual_revenue ? `Revenue: ${annual_revenue}` : null,
      founded_date ? `Founded: ${founded_date}` : null,
    ].filter(Boolean).join("\n");

    const location = [
      zipcode ? `Zipcode: ${zipcode}` : null,
      dma ? `DMA/Region: ${dma}` : null,
    ].filter(Boolean).join("\n");

    const digitalPresence = [
      domain ? `Website: ${domain}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      facebook ? `Facebook: ${facebook}` : null,
      instagram ? `Instagram: ${instagram}` : null,
    ].filter(Boolean).join("\n");

    const newsSection = news ? `Recent News: ${news}` : "";

    const prompt = `Generate Key Insights for this company as SHORT bullet points.

COMPANY INFORMATION:
${coreIdentity}

${businessScale}

${location}

${digitalPresence}

${newsSection}

STRICT RULES:
1. NO prose sentences. NO "what they do" summary.
2. Each bullet is a SHORT fact fragment (not a full sentence)
3. Start each line with "• "
4. Include ONLY these types of facts (if data available):
   - Employee count + revenue (e.g., "21 employees, ~$23.0M revenue")
   - Founded year (e.g., "Founded in 1958")
   - Location with zip (e.g., "Based in Phoenix, AZ (85027)")
   - Core specialty (e.g., "Specializes in post-tensioned concrete and hydrogrid fast-drying courts")
   - Recent acquisition or notable news (e.g., "Acquired by AstroTurf Corporation (Feb 11, 2025)")
5. Maximum 5 bullets. Skip any category with no data.

Generate the bullet points now:`;

    console.log("Generating Must Knows for lead:", leadId);

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
            content: "You output ONLY bullet points with short fact fragments. No prose. No full sentences. No 'what they do' summaries.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const mustKnows = aiData.choices?.[0]?.message?.content?.trim();

    if (!mustKnows) {
      throw new Error("No content generated from AI");
    }

    console.log("Generated Must Knows:", mustKnows);

    // Update the lead with the generated must_knows
    const { error: updateError } = await supabase
      .from("leads")
      .update({ must_knows: mustKnows })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, must_knows: mustKnows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-must-knows:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
