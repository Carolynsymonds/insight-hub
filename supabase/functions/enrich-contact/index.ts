import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialSearchLog {
  platform: string;
  query: string;
  found: boolean;
  source: 'apollo' | 'google_search';
  url?: string;
}

interface EnrichedContact {
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  headline?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  github_url?: string;
  organization_name?: string;
  organization_website?: string;
  organization_linkedin?: string;
  city?: string;
  state?: string;
  country?: string;
  source: string;
  social_search_logs?: SocialSearchLog[];
}

// Helper function to extract clean profile URL
function extractCleanProfileUrl(url: string, platform: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking params and normalize
    const cleanPath = parsed.pathname.replace(/\/$/, '');
    
    switch (platform) {
      case 'linkedin':
        // Extract /in/username format
        const linkedinMatch = cleanPath.match(/\/in\/([^\/]+)/);
        return linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : url;
      case 'facebook':
        // Extract profile name
        const fbMatch = cleanPath.match(/\/([^\/]+)/);
        if (fbMatch && !['pages', 'groups', 'events', 'profile.php'].includes(fbMatch[1])) {
          return `https://facebook.com/${fbMatch[1]}`;
        }
        return url;
      case 'twitter':
        const twitterMatch = cleanPath.match(/\/([^\/]+)/);
        if (twitterMatch && !['search', 'explore', 'home', 'i'].includes(twitterMatch[1])) {
          return `https://twitter.com/${twitterMatch[1]}`;
        }
        return url;
      case 'github':
        const githubMatch = cleanPath.match(/\/([^\/]+)/);
        if (githubMatch && !['search', 'explore', 'trending', 'topics'].includes(githubMatch[1])) {
          return `https://github.com/${githubMatch[1]}`;
        }
        return url;
      default:
        return url;
    }
  } catch {
    return url;
  }
}

// Helper function to search for person's social profile via SerpAPI
async function searchPersonSocial(
  apiKey: string,
  personName: string,
  companyName: string,
  platform: 'linkedin' | 'facebook' | 'twitter' | 'github'
): Promise<{ url: string | null; query: string }> {
  const siteDomains: Record<string, string> = {
    linkedin: 'linkedin.com/in',  // Personal profiles
    facebook: 'facebook.com',
    twitter: 'twitter.com',
    github: 'github.com'
  };

  // Query: "Person Name" "Company Name" site:platform.com
  const query = `"${personName}" "${companyName}" site:${siteDomains[platform]}`;
  
  console.log(`[enrich-contact] Searching ${platform} with query: ${query}`);

  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=5&api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[enrich-contact] SerpAPI error for ${platform}:`, response.status);
      return { url: null, query };
    }

    const data = await response.json();
    const results = data.organic_results || [];
    
    console.log(`[enrich-contact] ${platform} search returned ${results.length} results`);

    // Find first matching profile URL
    for (const result of results) {
      const link = result.link;
      if (link?.includes(siteDomains[platform])) {
        const cleanUrl = extractCleanProfileUrl(link, platform);
        console.log(`[enrich-contact] Found ${platform} profile: ${cleanUrl}`);
        return { url: cleanUrl, query };
      }
    }

    return { url: null, query };
  } catch (error) {
    console.error(`[enrich-contact] Error searching ${platform}:`, error);
    return { url: null, query };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, full_name, email, domain, company } = await req.json();
    console.log(`[enrich-contact] Starting enrichment for lead ${leadId}`, { full_name, email, domain, company });

    if (!leadId || !full_name || !email) {
      return new Response(
        JSON.stringify({ error: 'leadId, full_name, and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apolloApiKey) {
      console.error('[enrich-contact] APOLLO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Apollo API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Build Apollo People Match URL with query parameters
    const params = new URLSearchParams({
      name: full_name,
      email: email,
      reveal_personal_emails: 'false',
      reveal_phone_number: 'false'
    });

    // Add domain if available for better matching
    if (domain) {
      params.append('organization_domains', domain);
    }

    const apolloUrl = `https://api.apollo.io/api/v1/people/match?${params.toString()}`;
    console.log('[enrich-contact] Calling Apollo People Match API');

    const apolloResponse = await fetch(apolloUrl, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'x-api-key': apolloApiKey
      }
    });

    const apolloData = await apolloResponse.json();
    console.log('[enrich-contact] Apollo response:', JSON.stringify(apolloData, null, 2));

    if (!apolloResponse.ok) {
      console.error('[enrich-contact] Apollo API error:', apolloData);
      return new Response(
        JSON.stringify({ error: 'Apollo API error', details: apolloData }),
        { status: apolloResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const person = apolloData.person;
    
    if (!person) {
      console.log('[enrich-contact] No person found in Apollo');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No contact found in Apollo',
          enrichedContact: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize social search logs
    const socialSearchLogs: SocialSearchLog[] = [];

    // Extract enriched contact data from Apollo
    const enrichedContact: EnrichedContact = {
      name: person.name || full_name,
      first_name: person.first_name,
      last_name: person.last_name,
      title: person.title,
      headline: person.headline,
      email: person.email || email,
      email_status: person.email_status,
      linkedin_url: person.linkedin_url,
      facebook_url: person.facebook_url,
      twitter_url: person.twitter_url,
      github_url: person.github_url,
      organization_name: person.organization?.name,
      organization_website: person.organization?.website_url,
      organization_linkedin: person.organization?.linkedin_url,
      city: person.city,
      state: person.state,
      country: person.country,
      source: 'apollo_people_match'
    };

    // Log Apollo results for socials
    if (person.linkedin_url) {
      socialSearchLogs.push({ platform: 'linkedin', query: 'Apollo API', found: true, source: 'apollo', url: person.linkedin_url });
    }
    if (person.facebook_url) {
      socialSearchLogs.push({ platform: 'facebook', query: 'Apollo API', found: true, source: 'apollo', url: person.facebook_url });
    }
    if (person.twitter_url) {
      socialSearchLogs.push({ platform: 'twitter', query: 'Apollo API', found: true, source: 'apollo', url: person.twitter_url });
    }
    if (person.github_url) {
      socialSearchLogs.push({ platform: 'github', query: 'Apollo API', found: true, source: 'apollo', url: person.github_url });
    }

    // Step 3: If any socials are missing, search Google via Serper
    const missingSocials = {
      linkedin: !enrichedContact.linkedin_url,
      facebook: !enrichedContact.facebook_url,
      twitter: !enrichedContact.twitter_url,
      github: !enrichedContact.github_url
    };

    const hasMissingSocials = Object.values(missingSocials).some(v => v);

    if (hasMissingSocials && serpApiKey) {
      console.log('[enrich-contact] Step 3: Searching Google for missing socials');
      
      const personName = enrichedContact.name || full_name;
      const companyName = enrichedContact.organization_name || company || '';

      if (companyName) {
        // Search for missing LinkedIn
        if (missingSocials.linkedin) {
          const result = await searchPersonSocial(serpApiKey, personName, companyName, 'linkedin');
          socialSearchLogs.push({ 
            platform: 'linkedin', 
            query: result.query, 
            found: !!result.url, 
            source: 'google_search',
            url: result.url || undefined
          });
          if (result.url) {
            enrichedContact.linkedin_url = result.url;
          }
        }

        // Search for missing Facebook
        if (missingSocials.facebook) {
          const result = await searchPersonSocial(serpApiKey, personName, companyName, 'facebook');
          socialSearchLogs.push({ 
            platform: 'facebook', 
            query: result.query, 
            found: !!result.url, 
            source: 'google_search',
            url: result.url || undefined
          });
          if (result.url) {
            enrichedContact.facebook_url = result.url;
          }
        }

        // Search for missing Twitter
        if (missingSocials.twitter) {
          const result = await searchPersonSocial(serpApiKey, personName, companyName, 'twitter');
          socialSearchLogs.push({ 
            platform: 'twitter', 
            query: result.query, 
            found: !!result.url, 
            source: 'google_search',
            url: result.url || undefined
          });
          if (result.url) {
            enrichedContact.twitter_url = result.url;
          }
        }

        // Search for missing GitHub
        if (missingSocials.github) {
          const result = await searchPersonSocial(serpApiKey, personName, companyName, 'github');
          socialSearchLogs.push({ 
            platform: 'github', 
            query: result.query, 
            found: !!result.url, 
            source: 'google_search',
            url: result.url || undefined
          });
          if (result.url) {
            enrichedContact.github_url = result.url;
          }
        }
      } else {
        console.log('[enrich-contact] No company name available for Google social search');
      }
    } else if (hasMissingSocials && !serpApiKey) {
      console.log('[enrich-contact] SERPAPI_KEY not configured, skipping Step 3 social search');
    }

    // Add social search logs to contact
    enrichedContact.social_search_logs = socialSearchLogs;

    console.log('[enrich-contact] Final enriched contact:', enrichedContact);

    // Get current company_contacts
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('company_contacts')
      .eq('id', leadId)
      .single();

    if (fetchError) {
      console.error('[enrich-contact] Error fetching lead:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add enriched contact to company_contacts array
    const existingContacts = (leadData?.company_contacts as any[]) || [];
    const updatedContacts = [...existingContacts, enrichedContact];

    // Update lead with enriched contact
    const { error: updateError } = await supabase
      .from('leads')
      .update({ company_contacts: updatedContacts })
      .eq('id', leadId);

    if (updateError) {
      console.error('[enrich-contact] Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update lead', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-contact] Successfully enriched contact for lead', leadId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        enrichedContact,
        message: 'Contact enriched successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[enrich-contact] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
