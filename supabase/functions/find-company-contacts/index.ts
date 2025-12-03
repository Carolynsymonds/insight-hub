import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoveredContact {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string | null;
  email_status: string | null;
  linkedin_url: string;
  source: string;
  found_without_role_filter?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, domain } = await req.json();

    if (!leadId || !domain) {
      return new Response(
        JSON.stringify({ error: 'leadId and domain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apolloApiKey) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize domain
    const normalizedDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    console.log(`=== FIND COMPANY CONTACTS ===`);
    console.log(`Lead ID: ${leadId}`);
    console.log(`Domain: ${normalizedDomain}`);

    const discoveredContacts: DiscoveredContact[] = [];
    const targetTitles = ['ceo', 'owner', 'president', 'director', 'manager', 'founder', 'vp', 'chief'];

    // Step 1: Search for company contacts via Apollo People Search WITH role filters
    console.log('Step 1: Searching for company contacts with role filters...');

    const peopleSearchResponse = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'x-api-key': apolloApiKey,
      },
      body: JSON.stringify({
        person_titles: targetTitles,
        q_organization_domains: normalizedDomain,
        page: 1,
        per_page: 10
      })
    });

    if (!peopleSearchResponse.ok) {
      console.error(`People search failed: ${peopleSearchResponse.status}`);
      throw new Error(`Apollo People Search failed with status ${peopleSearchResponse.status}`);
    }

    const peopleData = await peopleSearchResponse.json();
    let people = peopleData.people || [];
    let usedFallback = false;

    console.log(`Found ${people.length} contacts with role filters at ${normalizedDomain}`);

    // FALLBACK: If no contacts found with role filters, search without filters
    if (people.length === 0) {
      console.log('No contacts found with role filters. Attempting fallback search without filters...');
      
      const fallbackSearchResponse = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'x-api-key': apolloApiKey,
        },
        body: JSON.stringify({
          q_organization_domains: normalizedDomain,
          page: 1,
          per_page: 10
          // NO person_titles filter
        })
      });

      if (fallbackSearchResponse.ok) {
        const fallbackData = await fallbackSearchResponse.json();
        people = fallbackData.people || [];
        usedFallback = true;
        console.log(`Fallback search found ${people.length} contacts (without role filters)`);
      } else {
        console.error(`Fallback search failed: ${fallbackSearchResponse.status}`);
      }
    }

    // Step 2: Process contacts based on whether we used fallback or not
    const contactsToEnrich = people.slice(0, 5);

    for (const person of contactsToEnrich) {
      if (usedFallback) {
        // For fallback contacts (no role filter), just store name/title - NO EMAIL enrichment
        discoveredContacts.push({
          id: person.id,
          name: person.name,
          first_name: person.first_name,
          last_name: person.last_name,
          title: person.title,
          email: null,  // Explicitly null - not retrieved
          email_status: null,
          linkedin_url: person.linkedin_url,
          source: 'apollo_people_search',
          found_without_role_filter: true
        });
        console.log(`Added fallback contact (name only): ${person.name} - ${person.title}`);
      } else {
        // Original logic - enrich with email via people/match
        try {
          console.log(`Enriching contact: ${person.name} (${person.id})`);
          const matchResponse = await fetch('https://api.apollo.io/api/v1/people/match', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json',
              'x-api-key': apolloApiKey,
            },
            body: JSON.stringify({
              id: person.id,
              reveal_personal_emails: false,
              reveal_phone_number: false
            })
          });

          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            const fullPerson = matchData.person;

            if (fullPerson) {
              discoveredContacts.push({
                id: fullPerson.id,
                name: fullPerson.name,
                first_name: fullPerson.first_name,
                last_name: fullPerson.last_name,
                title: fullPerson.title,
                email: fullPerson.email,
                email_status: fullPerson.email_status,
                linkedin_url: fullPerson.linkedin_url,
                source: 'apollo_people_search',
                found_without_role_filter: false
              });
              console.log(`Added contact: ${fullPerson.name} - ${fullPerson.email}`);
            }
          }
        } catch (matchError) {
          console.error(`Error matching person ${person.id}:`, matchError);
        }
      }
    }

    console.log(`Successfully processed ${discoveredContacts.length} contacts (fallback: ${usedFallback})`);

    // Update the lead with discovered contacts
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        company_contacts: discoveredContacts.length > 0 ? discoveredContacts : null
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log('Lead updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        contactsFound: discoveredContacts.length,
        usedFallback,
        contacts: discoveredContacts.map(c => ({ 
          name: c.name, 
          title: c.title, 
          email: c.email,
          found_without_role_filter: c.found_without_role_filter 
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in find-company-contacts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
