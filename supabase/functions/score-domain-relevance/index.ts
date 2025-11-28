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

    // Call Lovable AI to score the relevance
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at evaluating business domain names. Score how relevant and appropriate a domain name is for a given company name. Consider factors like: brand alignment, memorability, clarity, professionalism, and whether the domain makes sense for the company. Respond with a JSON object containing: score (0-100, where 100 is perfect match), and explanation (brief 1-2 sentence reasoning).'
          },
          {
            role: 'user',
            content: `Company Name: ${companyName}\nDomain: ${domain}\n\nScore this domain's relevance to the company name.`
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
                  }
                },
                required: ["score", "explanation"],
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

    console.log('Domain relevance scored:', { score, explanation });

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
