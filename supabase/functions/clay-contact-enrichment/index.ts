import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactEnrichmentRequest {
  full_name: string;
  email?: string;
  company?: string;
  domain?: string;
  city?: string;
  state?: string;
}

interface EnrichedContact {
  full_name: string;
  email: string | null;
  title: string | null;
  company: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  organization_name: string | null;
  organization_website: string | null;
  organization_industry: string | null;
  email_status: string | null;
  source: string;
  enrichment_logs: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ContactEnrichmentRequest = await req.json();
    const { full_name, email, company, domain, city, state } = requestData;

    console.log('Clay Contact Enrichment Request:', JSON.stringify(requestData));

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: 'full_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const serpapiKey = Deno.env.get('SERPAPI_KEY');

    const enrichmentLogs: any[] = [];
    let enrichedContact: EnrichedContact = {
      full_name,
      email: email || null,
      title: null,
      company: company || null,
      linkedin_url: null,
      facebook_url: null,
      twitter_url: null,
      organization_name: null,
      organization_website: null,
      organization_industry: null,
      email_status: null,
      source: 'clay_api',
      enrichment_logs: []
    };

    // Step 1: Search Apollo for contact details
    if (apolloApiKey) {
      console.log('Step 1: Searching Apollo for contact...');
      
      const apolloPayload: any = {
        first_name: full_name.split(' ')[0],
        last_name: full_name.split(' ').slice(1).join(' ') || undefined,
      };

      if (email) apolloPayload.email = email;
      if (domain) apolloPayload.organization_domain = domain;
      if (company) apolloPayload.organization_name = company;

      try {
        const apolloResponse = await fetch('https://api.apollo.io/api/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': apolloApiKey
          },
          body: JSON.stringify(apolloPayload)
        });

        const apolloData = await apolloResponse.json();
        console.log('Apollo response:', JSON.stringify(apolloData));

        const apolloLog = {
          step: 'apollo_people_match',
          timestamp: new Date().toISOString(),
          query: apolloPayload,
          found: !!apolloData.person,
          response_summary: apolloData.person ? {
            name: apolloData.person.name,
            title: apolloData.person.title,
            email: apolloData.person.email,
            linkedin_url: apolloData.person.linkedin_url
          } : null
        };
        enrichmentLogs.push(apolloLog);

        if (apolloData.person) {
          const person = apolloData.person;
          enrichedContact.email = person.email || enrichedContact.email;
          enrichedContact.title = person.title;
          enrichedContact.linkedin_url = person.linkedin_url;
          enrichedContact.facebook_url = person.facebook_url;
          enrichedContact.twitter_url = person.twitter_url;
          enrichedContact.email_status = person.email_status;
          
          if (person.organization) {
            enrichedContact.organization_name = person.organization.name;
            enrichedContact.organization_website = person.organization.website_url;
            enrichedContact.organization_industry = person.organization.industry;
            enrichedContact.company = person.organization.name || enrichedContact.company;
          }
        }
      } catch (apolloError: unknown) {
        console.error('Apollo API error:', apolloError);
        enrichmentLogs.push({
          step: 'apollo_people_match',
          timestamp: new Date().toISOString(),
          error: apolloError instanceof Error ? apolloError.message : String(apolloError),
          found: false
        });
      }
    }

    // Step 2: Search Google for missing social profiles
    if (serpapiKey && enrichedContact.company) {
      const missingSocials: string[] = [];
      if (!enrichedContact.linkedin_url) missingSocials.push('linkedin');
      if (!enrichedContact.facebook_url) missingSocials.push('facebook');
      if (!enrichedContact.twitter_url) missingSocials.push('twitter');

      if (missingSocials.length > 0) {
        console.log('Step 2: Searching Google for missing socials:', missingSocials);

        for (const platform of missingSocials) {
          const siteMap: Record<string, string> = {
            linkedin: 'linkedin.com/in',
            facebook: 'facebook.com',
            twitter: 'twitter.com'
          };

          const query = `"${full_name}" "${enrichedContact.company}" site:${siteMap[platform]}`;
          
          try {
            const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=3&api_key=${serpapiKey}`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();

            console.log(`${platform} search results:`, JSON.stringify(searchData.organic_results?.slice(0, 2)));

            const searchLog: any = {
              step: `google_search_${platform}`,
              timestamp: new Date().toISOString(),
              query,
              found: false,
              url: null
            };

            if (searchData.organic_results && searchData.organic_results.length > 0) {
              const result = searchData.organic_results[0];
              const url = result.link;

              if (url && url.includes(siteMap[platform])) {
                searchLog.found = true;
                searchLog.url = url;

                if (platform === 'linkedin') {
                  enrichedContact.linkedin_url = url;
                } else if (platform === 'facebook') {
                  enrichedContact.facebook_url = url;
                } else if (platform === 'twitter') {
                  enrichedContact.twitter_url = url;
                }
              }
            }

            enrichmentLogs.push(searchLog);
          } catch (searchError: unknown) {
            console.error(`${platform} search error:`, searchError);
            enrichmentLogs.push({
              step: `google_search_${platform}`,
              timestamp: new Date().toISOString(),
              query,
              error: searchError instanceof Error ? searchError.message : String(searchError),
              found: false
            });
          }
        }
      }
    }

    enrichedContact.enrichment_logs = enrichmentLogs;

    console.log('Final enriched contact:', JSON.stringify(enrichedContact));

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedContact
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in clay-contact-enrichment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
