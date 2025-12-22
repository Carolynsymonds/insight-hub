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
    const { 
      leadId, 
      company, 
      description, 
      products_services, 
      company_industry, 
      zipcode, 
      dma, 
      domain,
      email_domain_validated,
      match_score,
      facebook,
      facebook_validated,
      linkedin,
      linkedin_validated,
      instagram,
      instagram_validated
    } = await req.json();

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

    // Build enrichment status info
    const domainStatus = domain 
      ? (email_domain_validated ? '✓ Valid domain found' : '○ Domain found (unvalidated)')
      : '✗ No domain';
    
    const confidenceStatus = match_score !== null && match_score !== undefined
      ? `${match_score}% confidence`
      : 'No confidence score';

    // Build social media status
    const socials: string[] = [];
    if (facebook) socials.push(facebook_validated ? '✓ Facebook' : '○ Facebook');
    if (linkedin) socials.push(linkedin_validated ? '✓ LinkedIn' : '○ LinkedIn');
    if (instagram) socials.push(instagram_validated ? '✓ Instagram' : '○ Instagram');
    const socialStatus = socials.length > 0 ? socials.join(', ') : 'No socials found';

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
            content: 'You are a professional business writer. Generate ONE concise sentence that captures what the business does and why they are notable. Output ONLY the sentence with no additional text, headers, or labels.'
          },
          {
            role: 'user',
            content: `Generate a single summary sentence for this company:

Company Name: ${company || 'Unknown'}
Industry: ${company_industry || 'Unknown'}
Description: ${description || 'N/A'}
Products/Services: ${products_services || 'N/A'}

Requirements:
1. ONE sentence only: "What they do + why they're notable/unique"
2. DO NOT include: location, numbers, dates, founding year, acquisitions, revenue, employee count
3. Focus on their specialty, expertise, or what makes them stand out
4. Be factual and professional, no marketing fluff
5. Example format: "[Company] designs and renovates high-performance athletic facilities, known for advanced court construction and fast-drying surfacing systems."`
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
    const aiSummary = data.choices?.[0]?.message?.content?.trim();

    if (!aiSummary) {
      throw new Error('Empty response from AI');
    }

    // Combine AI summary with enrichment status
    const shortSummary = `${aiSummary}\n\n📊 ${domainStatus} | ${confidenceStatus}\n🔗 ${socialStatus}`;

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
