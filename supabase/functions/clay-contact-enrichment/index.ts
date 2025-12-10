import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactEnrichmentRequest {
  full_name: string;
  email?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  facebook_url?: string;
  location?: string;
  phone?: string;
  latest_experience?: string;
}

interface EnrichedContact {
  full_name: string;
  email: string | null;
  title: string | null;
  company: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  phone: string | null;
  location: string | null;
  latest_experience: string | null;
  organization_name: string | null;
  organization_website: string | null;
  organization_industry: string | null;
  email_status: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ContactEnrichmentRequest = await req.json();
    const { full_name, email, title, company, linkedin_url, facebook_url, location, phone, latest_experience } = requestData;

    console.log('Clay Contact Enrichment Request:', JSON.stringify(requestData));

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: 'full_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const serpapiKey = Deno.env.get('SERPAPI_KEY');

    // Initialize with provided data
    let enrichedContact: EnrichedContact = {
      full_name,
      email: email || null,
      title: title || null,
      company: company || null,
      linkedin_url: linkedin_url || null,
      facebook_url: facebook_url || null,
      twitter_url: null,
      phone: phone || null,
      location: location || null,
      latest_experience: latest_experience || null,
      organization_name: null,
      organization_website: null,
      organization_industry: null,
      email_status: null
    };

    // Parse location into city/state for Apollo search
    let city: string | undefined;
    let state: string | undefined;
    if (location) {
      const parts = location.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        city = parts[0];
        state = parts[1];
      } else {
        city = parts[0];
      }
    }

    // Step 1: Search Apollo for organization details and email verification
    if (apolloApiKey && (email || company)) {
      console.log('Searching Apollo for contact/organization details...');
      
      const apolloPayload: any = {
        first_name: full_name.split(' ')[0],
        last_name: full_name.split(' ').slice(1).join(' ') || undefined,
      };

      if (email) apolloPayload.email = email;
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

        if (apolloData.person) {
          const person = apolloData.person;
          
          // Only fill in missing data, don't overwrite provided data
          if (!enrichedContact.email) enrichedContact.email = person.email;
          if (!enrichedContact.title) enrichedContact.title = person.title;
          if (!enrichedContact.linkedin_url) enrichedContact.linkedin_url = person.linkedin_url;
          if (!enrichedContact.facebook_url) enrichedContact.facebook_url = person.facebook_url;
          if (!enrichedContact.twitter_url) enrichedContact.twitter_url = person.twitter_url;
          
          enrichedContact.email_status = person.email_status;
          
          if (person.organization) {
            enrichedContact.organization_name = person.organization.name;
            enrichedContact.organization_website = person.organization.website_url;
            enrichedContact.organization_industry = person.organization.industry;
            if (!enrichedContact.company) enrichedContact.company = person.organization.name;
          }
        }
      } catch (apolloError: unknown) {
        console.error('Apollo API error:', apolloError);
      }
    }

    // Step 2: Search Google for missing Twitter profile only
    if (serpapiKey && !enrichedContact.twitter_url && enrichedContact.company) {
      console.log('Searching Google for Twitter profile...');

      const query = `"${full_name}" "${enrichedContact.company}" site:twitter.com`;
      
      try {
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=3&api_key=${serpapiKey}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        console.log('Twitter search results:', JSON.stringify(searchData.organic_results?.slice(0, 2)));

        if (searchData.organic_results && searchData.organic_results.length > 0) {
          const result = searchData.organic_results[0];
          const url = result.link;

          if (url && url.includes('twitter.com')) {
            enrichedContact.twitter_url = url;
          }
        }
      } catch (searchError: unknown) {
        console.error('Twitter search error:', searchError);
      }
    }

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
