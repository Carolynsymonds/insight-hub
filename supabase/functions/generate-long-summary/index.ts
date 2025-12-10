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
      company_industry,
      mics_sector,
      founded_date,
      description, 
      products_services, 
      annual_revenue,
      size,
      zipcode, 
      dma, 
      domain,
      linkedin,
      facebook,
      instagram,
      news
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

    console.log(`Generating long summary for lead ${leadId}`);
    console.log(`Company: ${company}, Industry: ${company_industry}`);

    // Build social presence info
    const socialsInfo = [
      linkedin ? `LinkedIn: ${linkedin}` : null,
      facebook ? `Facebook: ${facebook}` : null,
      instagram ? `Instagram: ${instagram}` : null,
    ].filter(Boolean).join(', ');

    // Parse news if available
    let newsInfo = 'N/A';
    if (news) {
      try {
        const newsData = JSON.parse(news);
        if (newsData.items && newsData.items.length > 0) {
          newsInfo = newsData.items.slice(0, 2).map((item: any) => 
            `"${item.title}" (${item.source})`
          ).join('; ');
        }
      } catch {
        newsInfo = news.substring(0, 200);
      }
    }

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
            content: `You are a professional business writer. Generate a rich 5-8 line company profile following this exact structure:

1. Company Overview - Name, industry, founding year, and core purpose
2. What They Do - Key products, services, specializations, or value proposition
3. Scale & Operations - Team size, revenue, customer type, geographic coverage
4. Location - Where they operate (city, region, DMA)
5. Additional Insight (optional) - Notable achievements, recent news, or digital presence

Output ONLY the profile paragraph with no headers, labels, or bullet points. Write in a professional, factual tone.`
          },
          {
            role: 'user',
            content: `Generate a rich 5-8 line company profile for:

Company Name: ${company || 'Unknown'}
Industry: ${company_industry || 'Unknown'}
MICS Sector: ${mics_sector || 'N/A'}
Founded: ${founded_date || 'N/A'}
Description: ${description || 'N/A'}
Products/Services: ${products_services || 'N/A'}
Annual Revenue: ${annual_revenue || 'N/A'}
Company Size: ${size || 'N/A'}
Zipcode: ${zipcode || 'N/A'}
DMA (Region): ${dma || 'N/A'}
Domain: ${domain || 'N/A'}
Social Presence: ${socialsInfo || 'N/A'}
Recent News: ${newsInfo}

Write a professional paragraph covering: what they do, their scale, where they operate, and any notable aspects. Be factual and informative.`
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
    const longSummary = data.choices?.[0]?.message?.content?.trim();

    if (!longSummary) {
      throw new Error('Empty response from AI');
    }

    console.log(`Generated long summary: ${longSummary.substring(0, 100)}...`);

    // Update the lead record
    const { error: updateError } = await supabase
      .from('leads')
      .update({ long_summary: longSummary })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        long_summary: longSummary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-long-summary function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
