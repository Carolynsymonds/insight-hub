import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company, description, micsForm, micsNew, naicsCode, naicsTitle } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comparison prompt
    const prompt = `Compare these two industry classifications for a company:

Company: ${company || "Unknown"}
Business Description: ${description || "No description available"}

MICS (form) - User submitted: ${micsForm || "Not provided"}
MICS (new) - AI derived from NAICS: ${micsNew || "Not available"}
NAICS Code: ${naicsCode || "Not classified"}
NAICS Title: ${naicsTitle || "Not available"}

Provide:
1. A verdict: "match" (classifications align), "mismatch" (clearly different), or "partial" (overlapping but not exact)
2. For mismatch/partial: Explain specifically WHY the MICS (form) is wrong or inaccurate
3. Explain WHY the MICS (new) / NAICS classification is correct based on the company's actual business activities

Be specific and reference actual business activities. Keep explanations concise (1-2 sentences each).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are an industry classification expert. Analyze company classifications and provide clear, structured verdicts explaining why form data is wrong and why NAICS classification is correct. Always respond using the audit_classification function." 
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "audit_classification",
              description: "Return the audit result comparing MICS form vs NAICS-derived classification",
              parameters: {
                type: "object",
                properties: {
                  verdict: { 
                    type: "string", 
                    enum: ["match", "mismatch", "partial"],
                    description: "match = classifications align, mismatch = clearly different, partial = overlapping but not exact"
                  },
                  why_wrong: { 
                    type: "string",
                    description: "Why MICS (form) is wrong or inaccurate. If match, explain why it's actually correct."
                  },
                  why_right: { 
                    type: "string",
                    description: "Why MICS (new)/NAICS classification is correct based on actual business activities."
                  }
                },
                required: ["verdict", "why_wrong", "why_right"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "audit_classification" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "audit_classification") {
      throw new Error("Unexpected AI response format");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Audit error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
