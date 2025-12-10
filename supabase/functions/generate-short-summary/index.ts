import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, description, products_services, company_industry, zipcode, dma, domain } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'leadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating short summary for lead ${leadId}`);
    console.log(`Company: ${company}, Industry: ${company_industry}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional business writer. Generate a concise 2-3 line summary of what the business does and where it operates. Output ONLY the summary paragraph with no additional text, headers, or labels.'
          },
          {
            role: 'user',
            content: `Generate a 2-3 line summary for this company:

Company Name: ${company || 'Unknown'}
Industry: ${company_industry || 'Unknown'}
Description: ${description || 'N/A'}
Products/Services: ${products_services || 'N/A'}
Zipcode: ${zipcode || 'N/A'}
DMA (Region): ${dma || 'N/A'}
Domain: ${domain || 'N/A'}

Requirements:
1. First sentence: What the business does (use industry/description/products info)
2. Second sentence: Where they operate (use zipcode/DMA)
3. Be factual and professional, no marketing language
4. Keep it to 2-3 sentences maximum`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const shortSummary = data.choices?.[0]?.message?.content?.trim();

    if (!shortSummary) {
      throw new Error('Empty response from AI');
    }

    console.log(`Generated short summary: ${shortSummary.substring(0, 100)}...`);

    // Update the lead record
    const { error: updateError } = await supabase
      .from('leads')
      .update({ short_summary: shortSummary })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        short_summary: shortSummary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-short-summary function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
