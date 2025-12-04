import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  favicon?: string;
  snippet?: string;
  source?: string;
  rich_snippet?: {
    top?: {
      extensions?: string[];
      detected_extensions?: {
        rating?: number;
        reviews?: number;
      };
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      leadId,
      company,
      city,
      state,
      mics_sector,
      mics_subsector,
      mics_segment,
      facebookResults,
      linkedinResults,
      instagramResults,
    } = await req.json();

    console.log("Scoring social relevance for lead:", leadId);
    console.log("Lead info:", { company, city, state, mics_sector, mics_subsector, mics_segment });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt
    const prompt = `You are validating if social media search results belong to a specific company.

Lead Information:
- Company: ${company || "Not specified"}
- City: ${city || "Not specified"}
- State: ${state || "Not specified"}

Industry Classification (MICS):
- Sector: ${mics_sector || "Not specified"}
- Subsector: ${mics_subsector || "Not specified"}
- Segment: ${mics_segment || "Not specified"}

For each social platform below, analyze the organic search results and determine:
YES = The social profile clearly belongs to this specific company
NO = The social profile does NOT belong to this company or is uncertain

Consider:
1. Title and source fields should match or contain the company name
2. Location mentions in snippet should match city/state
3. Industry/services mentioned should align with MICS classification (if provided)
4. The profile should be for the EXACT company, not a similarly named one
5. If MICS data suggests one industry but social mentions a different industry, that's likely a NO

FACEBOOK RESULTS:
${facebookResults && facebookResults.length > 0 ? JSON.stringify(facebookResults, null, 2) : "No results"}

LINKEDIN RESULTS:
${linkedinResults && linkedinResults.length > 0 ? JSON.stringify(linkedinResults, null, 2) : "No results"}

INSTAGRAM RESULTS:
${instagramResults && instagramResults.length > 0 ? JSON.stringify(instagramResults, null, 2) : "No results"}

Analyze each platform and provide your validation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert at validating whether social media profiles belong to specific businesses." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_social_profiles",
              description: "Validate whether social media search results belong to the specified company",
              parameters: {
                type: "object",
                properties: {
                  facebook: {
                    type: "object",
                    properties: {
                      valid: { type: "boolean", description: "true if the Facebook profile belongs to this company, false otherwise" },
                      reason: { type: "string", description: "Brief explanation for the validation decision" },
                    },
                    required: ["valid", "reason"],
                  },
                  linkedin: {
                    type: "object",
                    properties: {
                      valid: { type: "boolean", description: "true if the LinkedIn profile belongs to this company, false otherwise" },
                      reason: { type: "string", description: "Brief explanation for the validation decision" },
                    },
                    required: ["valid", "reason"],
                  },
                  instagram: {
                    type: "object",
                    properties: {
                      valid: { type: "boolean", description: "true if the Instagram profile belongs to this company, false otherwise" },
                      reason: { type: "string", description: "Brief explanation for the validation decision" },
                    },
                    required: ["valid", "reason"],
                  },
                },
                required: ["facebook", "linkedin", "instagram"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "validate_social_profiles" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response:", JSON.stringify(aiResponse, null, 2));

    // Extract tool call result
    let validationResult = {
      facebook: { valid: false, reason: "No results to validate" },
      linkedin: { valid: false, reason: "No results to validate" },
      instagram: { valid: false, reason: "No results to validate" },
    };

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        validationResult = {
          facebook: parsed.facebook || validationResult.facebook,
          linkedin: parsed.linkedin || validationResult.linkedin,
          instagram: parsed.instagram || validationResult.instagram,
        };
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // If no results were provided, set valid to null (not scored)
    const facebookValid = facebookResults && facebookResults.length > 0 ? validationResult.facebook.valid : null;
    const linkedinValid = linkedinResults && linkedinResults.length > 0 ? validationResult.linkedin.valid : null;
    const instagramValid = instagramResults && instagramResults.length > 0 ? validationResult.instagram.valid : null;

    // Update database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const validationLog = {
      timestamp: new Date().toISOString(),
      lead_info: { company, city, state, mics_sector, mics_subsector, mics_segment },
      results: validationResult,
      facebook_results_count: facebookResults?.length || 0,
      linkedin_results_count: linkedinResults?.length || 0,
      instagram_results_count: instagramResults?.length || 0,
    };

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        facebook_validated: facebookValid,
        linkedin_validated: linkedinValid,
        instagram_validated: instagramValid,
        social_validation_log: validationLog,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    console.log("Successfully scored social relevance for lead:", leadId);

    return new Response(
      JSON.stringify({
        success: true,
        validation: validationResult,
        facebook_validated: facebookValid,
        linkedin_validated: linkedinValid,
        instagram_validated: instagramValid,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in score-social-relevance:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
