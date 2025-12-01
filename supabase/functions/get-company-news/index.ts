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
    const { leadId, company, state, domain } = await req.json();

    console.log('Getting company news for:', { leadId, company, state, domain });

    if (!leadId || !company) {
      throw new Error('Missing required parameters: leadId and company are required');
    }

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    if (!serpApiKey) {
      throw new Error('SERPAPI_KEY not configured');
    }

    // Build the search query
    let searchQuery = `"${company}"`;
    if (domain) {
      searchQuery += ` OR "${domain}"`;
    }
    if (state) {
      searchQuery += ` ${state}`;
    }

    console.log('Search query:', searchQuery);

    // Fetch news from SerpAPI
    const serpApiUrl = `https://serpapi.com/search?engine=google_news&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}`;
    
    const response = await fetch(serpApiUrl);
    
    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('SerpAPI response:', JSON.stringify(data, null, 2));

    // Format news results
    let formattedNews = '';
    
    if (data.news_results && data.news_results.length > 0) {
      const newsItems = data.news_results.slice(0, 10); // Limit to 10 news items
      
      formattedNews = newsItems.map((item: any, index: number) => {
        const title = item.title || 'No title';
        const source = item.source || 'Unknown source';
        const date = item.date || 'No date';
        const link = item.link || '';
        
        return `${index + 1}. ${title}\n   Source: ${source} | Date: ${date}\n   ${link}`;
      }).join('\n\n');

      console.log(`Found ${newsItems.length} news items`);
    } else {
      formattedNews = 'No news articles found for this company.';
      console.log('No news results found');
    }

    // Update the lead record with news data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        news: formattedNews,
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
        newsCount: data.news_results?.length || 0,
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
