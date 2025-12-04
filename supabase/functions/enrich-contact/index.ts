import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichedContact {
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  headline?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  organization_name?: string;
  organization_website?: string;
  organization_linkedin?: string;
  city?: string;
  state?: string;
  country?: string;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, full_name, email, domain } = await req.json();
    console.log(`[enrich-contact] Starting enrichment for lead ${leadId}`, { full_name, email, domain });

    if (!leadId || !full_name || !email) {
      return new Response(
        JSON.stringify({ error: 'leadId, full_name, and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
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

    // Extract enriched contact data
    const enrichedContact: EnrichedContact = {
      name: person.name || full_name,
      first_name: person.first_name,
      last_name: person.last_name,
      title: person.title,
      headline: person.headline,
      email: person.email || email,
      email_status: person.email_status,
      linkedin_url: person.linkedin_url,
      organization_name: person.organization?.name,
      organization_website: person.organization?.website_url,
      organization_linkedin: person.organization?.linkedin_url,
      city: person.city,
      state: person.state,
      country: person.country,
      source: 'apollo_people_match'
    };

    console.log('[enrich-contact] Enriched contact:', enrichedContact);

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
