import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, companyName, domain } = await req.json();

    console.log('Score domain relevance request:', { leadId, companyName, domain });

    // Validate required fields
    if (!leadId || !companyName || !domain) {
      throw new Error('Missing required fields: leadId, companyName, domain');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Helper function to calculate Levenshtein distance
    function levenshteinDistance(a: string, b: string): number {
      const matrix: number[][] = [];
      
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1,     // insertion
              matrix[i - 1][j] + 1      // deletion
            );
          }
        }
      }
      
      return matrix[b.length][a.length];
    }

    // Calculate Levenshtein distance for spelling correction detection
    const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domainRoot = domain.split('.')[0].toLowerCase();
    const distance = levenshteinDistance(normalizedCompany, domainRoot);

    console.log('Levenshtein distance:', { normalizedCompany, domainRoot, distance });

    // Call Lovable AI to score the relevance
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at evaluating if a domain name belongs to a company. Apply these STRICT scoring rules:

**RULE 1: Exact Match Override**
If the domain root (without TLD) exactly matches the company name (case-insensitive, spaces/punctuation removed):
→ Score: 100
Example: Company "Eberspacher" + Domain "eberspacher.com" = 100

**RULE 2: Spelling Correction Match (HIGH)**
If the domain appears to be a corrected spelling or close variant of the company name:
- Same prefix, same structure, minor character changes
- Small Levenshtein distance (typically ≤ 3 for similar-length names)
- Brand looks like one authoritative company
→ Score: 85-100
Example: Company "Eberspacer" + Domain "eberspaecher.com" = 90

**RULE 3: Strong Unique Brand Match (VERY HIGH)**
If the company name is distinctive/unique and the domain clearly matches it:
- Not a generic name
- Domain root closely matches company name
- Known official brand website
→ Score: 90-100

**RULE 4: Generic Company Names (LOWER DEFAULT)**
If the company name is generic or category-like (e.g., "Home Health Aide", "Plumbing", "Cleaning Service"):
- Hard to determine brand relevance
- Domain may serve that category but isn't a brand match
→ Score: 20-60, depending on closeness

**RULE 5: Real Mismatch (LOW)**
If domain and company name refer to unrelated entities:
- Different industries
- Different brand roots
- No shared brand pattern
- No plausible spelling correction
→ Score: 0-30
Example: Company "Roof Masters" + Domain "eberspaecher.com" = 10

Always explain which rule you applied and why.`
          },
          {
            role: 'user',
            content: `Company Name: ${companyName}
Domain: ${domain}
Normalized Company Name: ${normalizedCompany}
Domain Root: ${domainRoot}
Levenshtein Distance: ${distance}

Score this domain's relevance to the company name using the 5-tier scoring rules.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_domain",
              description: "Score the relevance of a domain to a company name",
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
                  },
                  rule_applied: {
                    type: "string",
                    enum: ["exact_match", "spelling_correction", "strong_brand", "generic_name", "mismatch"],
                    description: "Which scoring rule was applied"
                  }
                },
                required: ["score", "explanation", "rule_applied"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "score_domain" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Lovable AI response:', JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const score = result.score;
    const explanation = result.explanation;
    const ruleApplied = result.rule_applied;

    console.log('Domain relevance scored:', { score, explanation, ruleApplied });

    // Update lead with relevance score
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        domain_relevance_score: score,
        domain_relevance_explanation: explanation
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log('Lead updated successfully with domain relevance score');

    return new Response(
      JSON.stringify({
        success: true,
        score: score,
        explanation: explanation,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in score-domain-relevance function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
