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

interface StepResult {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'not_found';
  message?: string;
  data?: Record<string, any>;
}

interface EnrichmentSteps {
  check_existing: StepResult;
  apollo_search: StepResult;
  google_socials: StepResult;
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
  youtube_url?: string;
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
      case 'youtube':
        // Extract channel or user URL
        const ytChannelMatch = cleanPath.match(/\/(channel|c|user|@)\/([^\/]+)/);
        if (ytChannelMatch) {
          return `https://youtube.com/${ytChannelMatch[1]}/${ytChannelMatch[2]}`;
        }
        // Handle @username format
        const ytAtMatch = cleanPath.match(/\/(@[^\/]+)/);
        if (ytAtMatch) {
          return `https://youtube.com/${ytAtMatch[1]}`;
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
  platform: 'linkedin' | 'facebook' | 'twitter' | 'github' | 'youtube'
): Promise<{ url: string | null; query: string }> {
  const siteDomains: Record<string, string> = {
    linkedin: 'linkedin.com/in',  // Personal profiles
    facebook: 'facebook.com',
    twitter: 'twitter.com',
    github: 'github.com',
    youtube: 'youtube.com'
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

    // Initialize steps tracking
    const steps: EnrichmentSteps = {
      check_existing: { status: 'pending' },
      apollo_search: { status: 'pending' },
      google_socials: { status: 'pending' }
    };

    // ===== STEP 1: Check existing contacts =====
    console.log('[enrich-contact] Step 1: Checking existing contacts');
    steps.check_existing = { status: 'running', message: 'Checking if contact already exists...' };

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

    const existingContacts = (leadData?.company_contacts as any[]) || [];
    
    // Check if contact already exists by email or name
    const existingContact = existingContacts.find(c => 
      (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
      (full_name && c.name && c.name.toLowerCase() === full_name.toLowerCase())
    );

    if (existingContact) {
      const hasMissingSocials = !existingContact.linkedin_url || !existingContact.facebook_url || !existingContact.youtube_url;
      
      steps.check_existing = { 
        status: 'completed', 
        message: 'Contact already exists in company contacts',
        data: {
          name: existingContact.name,
          email: existingContact.email,
          source: existingContact.source,
          has_linkedin: !!existingContact.linkedin_url,
          has_facebook: !!existingContact.facebook_url,
          has_twitter: !!existingContact.twitter_url,
          has_github: !!existingContact.github_url,
          has_youtube: !!existingContact.youtube_url
        }
      };
      steps.apollo_search = { status: 'skipped', message: 'Skipped - contact already exists' };

      // If contact has missing socials, search Google for them
      if (hasMissingSocials && serpApiKey) {
        console.log('[enrich-contact] Contact exists but missing socials, searching Google...');
        steps.google_socials = { status: 'running', message: 'Searching Google for missing social profiles...' };
        
        const personName = existingContact.name || full_name;
        const companyName = existingContact.organization_name || company || '';

        const googleResults: Record<string, { searched: boolean; found: boolean; url?: string; query?: string }> = {
          linkedin: { searched: false, found: false },
          facebook: { searched: false, found: false },
          youtube: { searched: false, found: false }
        };

        if (companyName) {
          // Search for missing LinkedIn
          if (!existingContact.linkedin_url) {
            const result = await searchPersonSocial(serpApiKey, personName, companyName, 'linkedin');
            googleResults.linkedin = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
            if (result.url) {
              existingContact.linkedin_url = result.url;
            }
          }

          // Search for missing Facebook
          if (!existingContact.facebook_url) {
            const result = await searchPersonSocial(serpApiKey, personName, companyName, 'facebook');
            googleResults.facebook = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
            if (result.url) {
              existingContact.facebook_url = result.url;
            }
          }

          // Search for YouTube
          if (!existingContact.youtube_url) {
            const result = await searchPersonSocial(serpApiKey, personName, companyName, 'youtube');
            googleResults.youtube = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
            if (result.url) {
              existingContact.youtube_url = result.url;
            }
          }

          const foundAny = Object.values(googleResults).some(r => r.found);
          steps.google_socials = { 
            status: foundAny ? 'completed' : 'not_found', 
            message: foundAny ? 'Found additional social profiles via Google' : 'No additional social profiles found',
            data: {
              search_name: personName,
              search_company: companyName,
              results: googleResults
            }
          };

          // Update the contact in company_contacts array with new socials
          const updatedContacts = existingContacts.map(c => 
            (c.email?.toLowerCase() === email?.toLowerCase() || c.name?.toLowerCase() === full_name?.toLowerCase())
              ? existingContact
              : c
          );

          // Update lead with enriched contact AND personal social profiles
          const { error: updateError } = await supabase
            .from('leads')
            .update({ 
              company_contacts: updatedContacts,
              contact_linkedin: existingContact.linkedin_url || null,
              contact_facebook: existingContact.facebook_url || null,
              contact_youtube: existingContact.youtube_url || null
            })
            .eq('id', leadId);

          if (updateError) {
            console.error('[enrich-contact] Error updating lead with new socials:', updateError);
          }
        } else {
          steps.google_socials = { 
            status: 'skipped', 
            message: 'No company name available for Google search',
            data: { reason: 'missing_company_name' }
          };
        }
      } else {
        steps.google_socials = { status: 'skipped', message: hasMissingSocials ? 'Google search skipped - API key not configured' : 'All socials already found' };
        
        // Still update the lead's contact fields with existing socials
        await supabase
          .from('leads')
          .update({ 
            contact_linkedin: existingContact.linkedin_url || null,
            contact_facebook: existingContact.facebook_url || null,
            contact_youtube: existingContact.youtube_url || null
          })
          .eq('id', leadId);
      }

      console.log('[enrich-contact] Returning existing contact data (with any new socials)');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          enrichedContact: existingContact,
          steps,
          message: 'Contact found in company contacts'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    steps.check_existing = { 
      status: 'not_found', 
      message: 'Contact not found in existing contacts',
      data: { 
        lead_name: full_name, 
        lead_email: email,
        existing_contacts_count: existingContacts.length 
      }
    };

    // ===== STEP 2: Search Apollo =====
    console.log('[enrich-contact] Step 2: Searching Apollo People Match API');
    steps.apollo_search = { status: 'running', message: 'Searching Apollo People Match API...' };

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
      steps.apollo_search = { 
        status: 'not_found', 
        message: 'Apollo API error',
        data: { error: apolloData }
      };
      steps.google_socials = { status: 'skipped', message: 'Skipped - Apollo search failed' };

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Apollo API error', 
          details: apolloData,
          steps 
        }),
        { status: apolloResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const person = apolloData.person;
    
    if (!person) {
      console.log('[enrich-contact] No person found in Apollo');
      steps.apollo_search = { 
        status: 'not_found', 
        message: 'No contact found in Apollo',
        data: { search_params: { name: full_name, email, domain } }
      };
      steps.google_socials = { status: 'skipped', message: 'Skipped - no Apollo person to enrich' };

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No contact found in Apollo',
          enrichedContact: null,
          steps 
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
    const apolloSocials = {
      linkedin: !!person.linkedin_url,
      facebook: !!person.facebook_url,
      twitter: !!person.twitter_url,
      github: !!person.github_url
    };

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

    steps.apollo_search = { 
      status: 'completed', 
      message: 'Person found in Apollo',
      data: {
        name: person.name,
        title: person.title,
        email: person.email,
        email_status: person.email_status,
        organization: person.organization?.name,
        socials_found: apolloSocials
      }
    };

    // ===== STEP 3: Google search for missing socials =====
    const missingSocials = {
      linkedin: !enrichedContact.linkedin_url,
      facebook: !enrichedContact.facebook_url,
      twitter: !enrichedContact.twitter_url,
      github: !enrichedContact.github_url,
      youtube: true  // Always search for YouTube as Apollo doesn't provide it
    };

    const hasMissingSocials = Object.values(missingSocials).some(v => v);

    if (hasMissingSocials && serpApiKey) {
      console.log('[enrich-contact] Step 3: Searching Google for missing socials');
      steps.google_socials = { status: 'running', message: 'Searching Google for missing social profiles...' };
      
      const personName = enrichedContact.name || full_name;
      const companyName = enrichedContact.organization_name || company || '';

      const googleResults: Record<string, { searched: boolean; found: boolean; url?: string; query?: string }> = {
        linkedin: { searched: false, found: false },
        facebook: { searched: false, found: false },
        twitter: { searched: false, found: false },
        github: { searched: false, found: false },
        youtube: { searched: false, found: false }
      };

      if (companyName) {
        // Search for missing LinkedIn
        if (missingSocials.linkedin) {
          const result = await searchPersonSocial(serpApiKey, personName, companyName, 'linkedin');
          googleResults.linkedin = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
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
          googleResults.facebook = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
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
          googleResults.twitter = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
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
          googleResults.github = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
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

        // Always search for YouTube (Apollo doesn't provide it)
        if (missingSocials.youtube) {
          const result = await searchPersonSocial(serpApiKey, personName, companyName, 'youtube');
          googleResults.youtube = { searched: true, found: !!result.url, url: result.url || undefined, query: result.query };
          socialSearchLogs.push({ 
            platform: 'youtube', 
            query: result.query, 
            found: !!result.url, 
            source: 'google_search',
            url: result.url || undefined
          });
          if (result.url) {
            enrichedContact.youtube_url = result.url;
          }
        }

        const foundAny = Object.values(googleResults).some(r => r.found);
        steps.google_socials = { 
          status: foundAny ? 'completed' : 'not_found', 
          message: foundAny ? 'Found additional social profiles via Google' : 'No additional social profiles found',
          data: {
            search_name: personName,
            search_company: companyName,
            results: googleResults
          }
        };
      } else {
        console.log('[enrich-contact] No company name available for Google social search');
        steps.google_socials = { 
          status: 'skipped', 
          message: 'No company name available for Google search',
          data: { reason: 'missing_company_name' }
        };
      }
    } else if (hasMissingSocials && !serpApiKey) {
      console.log('[enrich-contact] SERPAPI_KEY not configured, skipping Step 3 social search');
      steps.google_socials = { 
        status: 'skipped', 
        message: 'Google search skipped - API key not configured',
        data: { reason: 'api_key_not_configured' }
      };
    } else {
      // All socials already found in Apollo
      steps.google_socials = { 
        status: 'skipped', 
        message: 'All social profiles already found in Apollo',
        data: { reason: 'all_socials_found_in_apollo' }
      };
    }

    // Add social search logs to contact
    enrichedContact.social_search_logs = socialSearchLogs;

    console.log('[enrich-contact] Final enriched contact:', enrichedContact);

    // Add enriched contact to company_contacts array
    const updatedContacts = [...existingContacts, enrichedContact];

    // Update lead with enriched contact AND personal social profiles
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        company_contacts: updatedContacts,
        contact_linkedin: enrichedContact.linkedin_url || null,
        contact_facebook: enrichedContact.facebook_url || null,
        contact_youtube: enrichedContact.youtube_url || null
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('[enrich-contact] Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update lead', details: updateError, steps }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-contact] Successfully enriched contact for lead', leadId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        enrichedContact,
        steps,
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
