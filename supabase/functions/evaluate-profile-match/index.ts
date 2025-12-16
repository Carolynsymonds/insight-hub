import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a lead-enrichment verification engine.

Your task is to evaluate whether a social profile belongs to the given person
based ONLY on the provided data.

You must:
- Compare name, company, role, email domain, location, and profile type
- Assign a numeric match_score from 0 to 100
- Classify the result
- Provide short, factual reasons

Be strict. Penalize uncertainty. Do NOT assume matches.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enrichmentId, leadData, profileData } = await req.json();

    console.log("[evaluate-profile-match] Starting evaluation for enrichment:", enrichmentId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build user prompt
    const userPrompt = `Evaluate whether the social profile matches the contact.

CONTACT
Name: ${leadData.name || "Unknown"}
Title: ${profileData.title_clay || "Unknown"}
Company: ${leadData.company || "Unknown"}
Email: ${leadData.email || "Unknown"}
Location: ${leadData.location || profileData.location_clay || "Unknown"}

SOCIAL PROFILE
Platform: ${profileData.platform || "LinkedIn"}
Profile URL: ${profileData.linkedin || "None"}
Profile Name: ${profileData.full_name || leadData.name || "Unknown"}
Profile Headline / Bio: ${profileData.title_clay || "Unknown"}
Profile Company: ${profileData.company_clay || "Unknown"}
Profile Location: ${profileData.location_clay || "Unknown"}
Profile Type: personal profile

SCORING RULES (apply all):

+40 points if email domain clearly matches the company
+25 points if profile is a PERSONAL profile (not a company page)
+15 points if full name matches exactly
+10 points if role/title is plausible for the company
+10 points if location aligns (city/state/country)

−40 points if email is generic (gmail, yahoo, outlook, etc.)
−30 points if profile is a company page
−20 points if only name matches but company does not
−20 points if name is common AND no strong company signal
−25 points if company or role conflicts

Classification rules:
- match_score ≥ 80 → high confidence match
- 60–79 → medium confidence (needs review)
- <60 → not a match`;

    console.log("[evaluate-profile-match] Calling AI for evaluation");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_profile_match",
              description: "Evaluate whether a social profile matches the contact and return structured results",
              parameters: {
                type: "object",
                properties: {
                  is_match: { type: "boolean", description: "Whether the profile is a match" },
                  match_score: { type: "number", description: "Score from 0-100" },
                  confidence_level: { 
                    type: "string", 
                    enum: ["high", "medium", "low"],
                    description: "Confidence level based on score" 
                  },
                  reasons: {
                    type: "array",
                    items: { type: "string" },
                    description: "Short factual reasons for the score"
                  }
                },
                required: ["is_match", "match_score", "confidence_level", "reasons"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "evaluate_profile_match" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[evaluate-profile-match] AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("[evaluate-profile-match] AI response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("[evaluate-profile-match] Parsed result:", result);

    // Update the clay_enrichments record with the evaluation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("clay_enrichments")
      .update({
        profile_match_score: result.match_score,
        profile_match_confidence: result.confidence_level,
        profile_match_reasons: result.reasons,
        profile_match_evaluated_at: new Date().toISOString(),
      })
      .eq("id", enrichmentId);

    if (updateError) {
      console.error("[evaluate-profile-match] Database update error:", updateError);
      throw updateError;
    }

    console.log("[evaluate-profile-match] Successfully updated enrichment with evaluation");

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          is_match: result.is_match,
          match_score: result.match_score,
          confidence_level: result.confidence_level,
          reasons: result.reasons,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[evaluate-profile-match] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
