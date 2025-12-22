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

    // Build enrichment status info with clickable links
    const domainLink = domain 
      ? `<a href="https://${domain.replace(/^https?:\/\//, '')}" target="_blank" rel="noopener noreferrer">${email_domain_validated ? '✓' : '○'} ${domain}</a>`
      : '✗ No domain';
    
    const confidenceStatus = match_score !== null && match_score !== undefined
      ? `${match_score}% confidence`
      : 'No confidence score';

    // Build social media status with clickable links
    const socials: string[] = [];
    if (facebook) {
      const fbUrl = facebook.startsWith('http') ? facebook : `https://${facebook}`;
      socials.push(`<a href="${fbUrl}" target="_blank" rel="noopener noreferrer">${facebook_validated ? '✓' : '○'} Facebook</a>`);
    }
    if (linkedin) {
      const liUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
      socials.push(`<a href="${liUrl}" target="_blank" rel="noopener noreferrer">${linkedin_validated ? '✓' : '○'} LinkedIn</a>`);
    }
    if (instagram) {
      const igUrl = instagram.startsWith('http') ? instagram : `https://${instagram}`;
      socials.push(`<a href="${igUrl}" target="_blank" rel="noopener noreferrer">${instagram_validated ? '✓' : '○'} Instagram</a>`);
    }
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
            content: 'You are a professional business writer. Generate ONE sentence with **bold** markdown on 2-3 key phrases. ALWAYS use **double asterisks** to bold important terms like product types, services, or differentiators.'
          },
          {
            role: 'user',
            content: `Generate a single summary sentence for this company:

Company Name: ${company || 'Unknown'}
Industry: ${company_industry || 'Unknown'}
Description: ${description || 'N/A'}
Products/Services: ${products_services || 'N/A'}

CRITICAL REQUIREMENTS:
1. ONE sentence only: "What they do + why they're notable"
2. MUST use **bold** on 2-3 key phrases (products, services, specialty)
3. DO NOT include: location, numbers, dates, founding year, revenue, employee count
4. Be factual and professional

EXAMPLE OUTPUT (note the **bold** formatting):
"Papa D's Bones provides a diverse selection of **natural chew treats for dogs**, including **smoked bones, raw bones, and antlers**, serving pet owners seeking premium natural products."

Generate the sentence with bold formatting now:`
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

    // Combine AI summary with enrichment status (no emoji icons)
    const shortSummary = `${aiSummary}\n\n${domainLink} | ${confidenceStatus}\n${socialStatus}`;

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
