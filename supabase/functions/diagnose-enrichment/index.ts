import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, leadData, enrichmentLogs } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!leadId) {
      throw new Error("leadId is required");
    }

    // Build context from lead data and logs
    const leadContext = `
Lead Information:
- Company: ${leadData.company || 'Not provided'}
- City: ${leadData.city || 'Not provided'}
- State: ${leadData.state || 'Not provided'}
- Zipcode: ${leadData.zipcode || 'Not provided'}
- Email: ${leadData.email || 'Not provided'}
- MICS Sector: ${leadData.mics_sector || 'Not provided'}
- Full Name: ${leadData.full_name || 'Not provided'}

Enrichment Attempts:
${enrichmentLogs.map((log: any, idx: number) => `
Attempt ${idx + 1} (${log.source}):
- Search Query: ${log.search_query || 'Not provided'}
- Organizations Found: ${log.organizations_found || 0}
- Domain Found: ${log.domain || 'None'}
- Confidence: ${log.confidence || 0}%
`).join('\n')}
`;

    const systemPrompt = `You are an expert data analyst specializing in lead enrichment diagnostics. Your job is to analyze why a company domain enrichment failed and provide actionable insights.

You must classify the failure into ONE of these specific categories:
1. "Fake/test data" - Company name looks generated or nonsensical (e.g., "Test Company", "ACME", "Sample LLC")
2. "Wrong input format" - Misspellings, incomplete information, formatting problems
3. "Company doesn't exist" - Very small business with no web presence, or company may be closed
4. "Data quality issues" - Missing critical fields (city, state) that make search impossible
5. "Niche/local business" - May not have a web presence, hyper-local or specialized

Provide your response in exactly this JSON structure:
{
  "category": "<one of the 5 categories above, exact text>",
  "diagnosis": "Brief explanation of why enrichment failed (2-3 sentences)",
  "recommendation": "Specific actionable suggestion (1-2 sentences)",
  "confidence": "high" | "medium" | "low"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze why domain enrichment failed for this lead:\n\n${leadContext}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    
    console.log("AI Response:", aiContent);
    
    // Parse the JSON response from AI
    let diagnosis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        diagnosis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if AI didn't return proper JSON
        diagnosis = {
          category: "Data quality issues",
          diagnosis: aiContent,
          recommendation: "Review the lead data for accuracy and completeness.",
          confidence: "medium"
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      diagnosis = {
        category: "Data quality issues",
        diagnosis: aiContent,
        recommendation: "Review the lead data for accuracy and completeness.",
        confidence: "medium"
      };
    }

    // Store diagnosis in database
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      // Return diagnosis even if storage fails
      return new Response(JSON.stringify(diagnosis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update lead with diagnosis results
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        diagnosis_category: diagnosis.category,
        diagnosis_explanation: diagnosis.diagnosis,
        diagnosis_recommendation: diagnosis.recommendation,
        diagnosis_confidence: diagnosis.confidence,
        diagnosed_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error("Failed to store diagnosis:", updateError);
    }

    return new Response(JSON.stringify(diagnosis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("diagnose-enrichment error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        category: "Data quality issues",
        diagnosis: "Unable to complete diagnosis at this time.",
        recommendation: "Please try again later or contact support if the issue persists.",
        confidence: "low"
      }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
