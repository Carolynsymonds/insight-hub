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
  email: string;
  email_status: string;
  linkedin_url: string;
  source: string;
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

    // Step 1: Search for company contacts via Apollo People Search
    console.log('Step 1: Searching for company contacts...');

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
    const people = peopleData.people || [];
    console.log(`Found ${people.length} contacts at ${normalizedDomain}`);

    // Step 2: For each person (limit to 5), get verified email via People Match
    const contactsToEnrich = people.slice(0, 5);

    for (const person of contactsToEnrich) {
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
              source: 'apollo_people_search'
            });
            console.log(`Added contact: ${fullPerson.name} - ${fullPerson.email}`);
          }
        }
      } catch (matchError) {
        console.error(`Error matching person ${person.id}:`, matchError);
      }
    }

    console.log(`Successfully enriched ${discoveredContacts.length} contacts`);

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
        contacts: discoveredContacts.map(c => ({ name: c.name, title: c.title, email: c.email }))
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
