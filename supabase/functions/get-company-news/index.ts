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
    const { leadId, company, domain } = await req.json();

    console.log('Getting company news for:', { leadId, company, domain });

    if (!leadId || !company) {
      throw new Error('Missing required parameters: leadId and company are required');
    }

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    if (!serpApiKey) {
      throw new Error('SERPAPI_KEY not configured');
    }

    // Search by domain only (or company name as fallback)
    const searchQuery = domain || company;

    console.log('Search query:', searchQuery);

    // Fetch news from SerpAPI using Google News tab
    const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&tbm=nws&hl=en&gl=us&api_key=${serpApiKey}`;
    
    const response = await fetch(serpApiUrl);
    
    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('SerpAPI response:', JSON.stringify(data, null, 2));

    // Store structured JSON with first 3 results
    const newsData = {
      search_query: searchQuery,
      searched_at: new Date().toISOString(),
      news_count: Math.min(data.news_results?.length || 0, 3),
      items: (data.news_results || []).slice(0, 3).map((item: any) => ({
        position: item.position,
        link: item.link || '',
        title: item.title || 'No title',
        source: item.source || 'Unknown source',
        date: item.date || 'No date',
        published_at: item.published_at || null,
        snippet: item.snippet || '',
        favicon: item.favicon || null,
        thumbnail: item.thumbnail || null
      }))
    };

    console.log(`Storing ${newsData.news_count} news items`);

    // Update the lead record with news data as JSON string
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        news: JSON.stringify(newsData),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`);
    }

    console.log('Successfully updated lead with news data');

    return new Response(
      JSON.stringify({ 
        success: true,
        newsCount: newsData.news_count,
        message: 'Company news fetched successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-company-news function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
