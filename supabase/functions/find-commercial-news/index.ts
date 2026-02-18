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
    console.log('find-commercial-news:', { leadId, company, domain });

    if (!leadId || !company) {
      throw new Error('Missing required parameters: leadId and company');
    }

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    if (!serpApiKey) throw new Error('SERPAPI_KEY not configured');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    // Step 1: SerpAPI search
    const searchQuery = `"${company}" AND (funding OR expansion OR partnership OR launch)`;
    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&num=10&hl=en&gl=us&api_key=${serpApiKey}`;

    const serpResp = await fetch(serpUrl);
    if (!serpResp.ok) throw new Error(`SerpAPI failed: ${serpResp.statusText}`);
    const serpData = await serpResp.json();

    const organicResults = (serpData.organic_results || []).slice(0, 10);
    console.log(`Got ${organicResults.length} search results`);

    if (organicResults.length === 0) {
      const noResultsData = {
        news_found: false,
        reason: 'No search results returned for this company.',
        confidence_score: 90,
        searched_at: new Date().toISOString(),
        search_query: searchQuery,
      };
      await updateLeadNews(leadId, noResultsData);
      return jsonResponse(noResultsData);
    }

    // Step 2: AI analysis via Lovable AI
    const snippets = organicResults.map((r: any, i: number) =>
      `[${i + 1}] Title: ${r.title || ''}\nSnippet: ${r.snippet || ''}\nURL: ${r.link || ''}`
    ).join('\n\n');

    const systemPrompt = `You are a commercial news analyst. Analyze search results to find commercially relevant news about a specific company.

Rules:
- Only consider results clearly referring to the correct company: "${company}"${domain ? ` (domain: ${domain})` : ''}
- Use the company domain (if provided) to validate matches
- Ignore similarly named companies, blog spam, directories, job boards
- If uncertain whether a result is about the correct company, exclude it
- Only flag genuinely commercial events: funding, expansion, partnership, launch, acquisition, contract`;

    const userPrompt = `Company: ${company}${domain ? `\nDomain: ${domain}` : ''}\n\nSearch Results:\n${snippets}\n\nAnalyze these results and determine if there is recent commercially relevant news about this specific company.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_company_news',
            description: 'Return structured analysis of commercial news for a company',
            parameters: {
              type: 'object',
              properties: {
                news_found: { type: 'boolean', description: 'Whether relevant commercial news was found' },
                event_type: { type: 'string', enum: ['funding', 'expansion', 'partnership', 'launch', 'acquisition', 'contract', 'other'] },
                headline: { type: 'string', description: 'Short summary, max 20 words' },
                event_summary: { type: 'string', description: '1-2 sentence factual summary' },
                source_url: { type: 'string', description: 'Best source URL' },
                estimated_recency: { type: 'string', enum: ['recent', '6-12 months', 'old', 'unknown'] },
                confidence_score: { type: 'integer', description: '0-100 confidence score' },
                reason: { type: 'string', description: 'Explanation when no news found' },
              },
              required: ['news_found', 'confidence_score'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_company_news' } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, errText);
      throw new Error(`AI analysis failed: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('AI did not return structured output');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const newsData = {
      ...result,
      searched_at: new Date().toISOString(),
      search_query: searchQuery,
    };

    console.log('AI result:', JSON.stringify(newsData));

    await updateLeadNews(leadId, newsData);
    return jsonResponse(newsData);

  } catch (error) {
    console.error('Error in find-commercial-news:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateLeadNews(leadId: string, newsData: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { error } = await supabase
    .from('leads')
    .update({ news: JSON.stringify(newsData), updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  });
}
