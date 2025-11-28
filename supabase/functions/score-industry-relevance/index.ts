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
    const { leadId, domain, micsSector, micsSubsector, micsSegment } = await req.json();

    console.log("Scoring industry relevance for:", { leadId, domain, micsSector, micsSubsector, micsSegment });

    if (!leadId || !domain) {
      throw new Error("leadId and domain are required");
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build prompt with available MICS data
    let micsInfo = "";
    if (micsSector) micsInfo += `\n- MICS Sector: ${micsSector}`;
    if (micsSubsector) micsInfo += `\n- MICS Subsector: ${micsSubsector}`;
    if (micsSegment) micsInfo += `\n- MICS Segment: ${micsSegment}`;

    const prompt = `Based on this domain: ${domain}

Tell me how relevant this company is to the industry classification:${micsInfo}

Analyze the website content, services, and business focus. Consider:
- Does the company's website and services align with this industry classification?
- Is the business focus consistent with the MICS categories?
- How well does the domain content match the expected industry?

Provide a score from 0-100 where:
- 90-100: Perfect match, clearly operates in this industry
- 70-89: Strong match, primary business aligns well
- 50-69: Moderate match, partially aligned with industry
- 30-49: Weak match, some connection but not primary focus
- 0-29: Poor match, minimal or no connection to industry`;

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
              name: "score_industry_relevance",
              description: "Score how relevant a company is to its MICS industry classification",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Relevance score from 0-100"
                  },
                  explanation: {
                    type: "string",
                    description: "Brief explanation of the score"
                  }
                },
                required: ["score", "explanation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "score_industry_relevance" } }
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
        industry_relevance_score: score,
        industry_relevance_explanation: explanation,
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
    console.error("Error in score-industry-relevance:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
