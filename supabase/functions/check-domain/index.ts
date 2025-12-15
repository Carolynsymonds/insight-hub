import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, domain, company, city, state } = await req.json();

    if (!leadId || !domain) {
      return new Response(
        JSON.stringify({ error: "leadId and domain are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking domain validity for lead ${leadId}: ${domain} (Company: ${company})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const scraperApiKey = Deno.env.get('SCRAPER_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!scraperApiKey) {
      throw new Error("SCRAPER_API_KEY is not configured");
    }
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Scrape the domain homepage
    console.log(`Step 1: Scraping homepage of ${domain}`);
    const scrapeUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=https://${domain}&render=true`;
    
    let scrapedContent = "";
    let scrapeError = null;
    
    try {
      const scrapeResponse = await fetch(scrapeUrl, {
        headers: { 'Accept': 'text/html' }
      });
      
      if (scrapeResponse.ok) {
        const html = await scrapeResponse.text();
        
        // Extract relevant content from HTML
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : "";
        
        const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
        const h1 = h1Match ? h1Match[1].trim() : "";
        
        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";
        
        const metaKeywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
        const metaKeywords = metaKeywordsMatch ? metaKeywordsMatch[1].trim() : "";
        
        // Get body text (remove scripts and styles)
        let bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        bodyText = bodyText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        bodyText = bodyText.replace(/<[^>]+>/g, ' ');
        bodyText = bodyText.replace(/\s+/g, ' ').trim().substring(0, 2000);
        
        scrapedContent = `Title: ${title}\nH1: ${h1}\nMeta Description: ${metaDesc}\nMeta Keywords: ${metaKeywords}\nBody Content: ${bodyText}`;
        console.log(`Scraped content length: ${scrapedContent.length} characters`);
      } else {
        scrapeError = `Scrape failed with status ${scrapeResponse.status}`;
        console.log(scrapeError);
      }
    } catch (e) {
      scrapeError = `Scrape error: ${e instanceof Error ? e.message : 'Unknown error'}`;
      console.log(scrapeError);
    }

    // Step 2: Use AI to validate if the domain belongs to the company
    console.log(`Step 2: AI validation of domain match`);
    
    let isValid = false;
    let confidence = 0;
    let reason = "";

    if (scrapedContent) {
      const prompt = `You are a business verification assistant. Analyze whether the website content matches the company being searched for.

COMPANY INFORMATION:
- Company Name: ${company || 'Unknown'}
- City: ${city || 'Unknown'}
- State: ${state || 'Unknown'}
- Domain: ${domain}

WEBSITE CONTENT:
${scrapedContent}

TASK: Determine if this website belongs to the company "${company}" located in ${city}, ${state}.

Consider:
1. Does the website title, description, or content mention the company name or similar variations?
2. Does the location mentioned on the website match (city, state, or region)?
3. Is this clearly a different company with a similar name?
4. Is this a parked domain, for-sale page, or unrelated website?

Respond in this exact JSON format:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation of why this domain does or doesn't match the company"
}`;

      try {
        const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          console.log(`AI response: ${content}`);
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            isValid = parsed.isValid === true;
            confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
            reason = parsed.reason || 'No explanation provided';
          }
        } else {
          console.log(`AI API error: ${aiResponse.status}`);
          reason = "AI validation failed - could not analyze website";
        }
      } catch (e) {
        console.log(`AI parsing error: ${e instanceof Error ? e.message : 'Unknown'}`);
        reason = "AI validation failed - parsing error";
      }
    } else {
      reason = scrapeError || "Could not scrape website content";
      isValid = false;
      confidence = 0;
    }

    // Step 3: Update the lead with validation result
    console.log(`Step 3: Updating lead - Valid: ${isValid}, Confidence: ${confidence}%`);
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        email_domain_validated: isValid,
        domain_relevance_explanation: `Domain Check: ${reason} (Confidence: ${confidence}%)`,
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log(`Domain check complete for ${domain}: ${isValid ? 'VALID' : 'INVALID'}`);

    return new Response(
      JSON.stringify({
        success: true,
        isValid,
        confidence,
        reason,
        domain,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-domain:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
