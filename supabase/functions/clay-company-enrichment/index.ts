import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClayCompanyData {
  domain: string;
  size?: string;
  industry?: string;
  locality?: string;
  logo?: string;
  annual_revenue?: string;
  founded?: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ClayCompanyData = await req.json();
    console.log('Received Clay company data:', JSON.stringify(data));

    // Validate required field
    if (!data.domain) {
      console.error('Missing required field: domain');
      return new Response(
        JSON.stringify({ success: false, error: 'domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find lead by domain
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('domain', data.domain)
      .maybeSingle();

    if (leadError) {
      console.error('Error finding lead:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error finding lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lead) {
      console.log('No lead found for domain:', data.domain);
      return new Response(
        JSON.stringify({ success: true, lead_updated: false, message: 'No lead found for domain', data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found lead:', lead.id);

    // Update leads table with company data
    const leadUpdatePayload: Record<string, unknown> = {};
    if (data.size) leadUpdatePayload.size = data.size;
    if (data.industry) leadUpdatePayload.company_industry = data.industry;
    if (data.logo) leadUpdatePayload.logo_url = data.logo;
    if (data.annual_revenue) leadUpdatePayload.annual_revenue = data.annual_revenue;
    if (data.founded) leadUpdatePayload.founded_date = data.founded;
    if (data.description) leadUpdatePayload.description = data.description;

    if (Object.keys(leadUpdatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('leads')
        .update(leadUpdatePayload)
        .eq('id', lead.id);

      if (updateError) {
        console.error('Error updating lead:', updateError);
      } else {
        console.log('Updated lead with fields:', Object.keys(leadUpdatePayload));
      }
    }

    // Delete existing company enrichment for this lead
    const { error: deleteError } = await supabase
      .from('clay_company_enrichment')
      .delete()
      .eq('lead_id', lead.id);

    if (deleteError) {
      console.error('Error deleting existing enrichment:', deleteError);
    }

    // Insert new company enrichment
    const { data: enrichment, error: insertError } = await supabase
      .from('clay_company_enrichment')
      .insert({
        lead_id: lead.id,
        domain: data.domain,
        size_clay: data.size,
        industry_clay: data.industry,
        locality_clay: data.locality,
        logo_clay: data.logo,
        annual_revenue_clay: data.annual_revenue,
        founded_clay: data.founded,
        description_clay: data.description,
        raw_response: data,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting company enrichment:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error storing company enrichment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created company enrichment:', enrichment.id);

    return new Response(
      JSON.stringify({
        success: true,
        lead_updated: true,
        lead_id: lead.id,
        enrichment_id: enrichment.id,
        data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
