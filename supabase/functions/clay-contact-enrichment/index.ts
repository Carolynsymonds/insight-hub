import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClayContactData {
  full_name: string;
  email?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  phone?: string;
  location?: string;
  latest_experience?: string;
  summary?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clayData: ClayContactData = await req.json();
    const { 
      full_name, email, title, company, linkedin_url, facebook_url, twitter_url,
      phone, location, latest_experience, summary
    } = clayData;

    console.log('Clay Contact Data Received:', JSON.stringify(clayData));

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: 'full_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required to match lead' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let leadUpdated = false;
    let leadId: string | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      console.log('Matching lead by email:', email);
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Find lead by email
      const { data: leads, error: findError } = await supabase
        .from('leads')
        .select('id, user_id')
        .eq('email', email)
        .limit(1);

      if (findError) {
        console.error('Error finding lead:', findError);
      } else if (leads && leads.length > 0) {
        leadId = leads[0].id;

        // Build contact_details JSON for leads table update
        const contactDetails: Record<string, string> = {};
        if (latest_experience) contactDetails.latest_experience = latest_experience;
        if (location) contactDetails.location = location;
        if (phone) contactDetails.phone = phone;
        if (company) contactDetails.company = company;
        if (title) contactDetails.title = title;

        // Update lead with Clay data
        const updatePayload: Record<string, any> = {};
        if (linkedin_url) updatePayload.contact_linkedin = linkedin_url;
        if (facebook_url) updatePayload.contact_facebook = facebook_url;
        if (Object.keys(contactDetails).length > 0) updatePayload.contact_details = contactDetails;

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', leadId);

          if (updateError) {
            console.error('Error updating lead:', updateError);
          } else {
            leadUpdated = true;
            console.log('Lead updated successfully:', leadId);
          }
        }

        // Delete any existing clay_enrichments for this lead (keep only latest)
        await supabase
          .from('clay_enrichments')
          .delete()
          .eq('lead_id', leadId);

        // Insert new clay enrichment record
        const { error: insertError } = await supabase
          .from('clay_enrichments')
          .insert({
            lead_id: leadId,
            full_name,
            email,
            linkedin: linkedin_url,
            title_clay: title,
            company_clay: company,
            twitter_url_clay: twitter_url,
            facebook_url_clay: facebook_url,
            latest_experience_clay: latest_experience,
            location_clay: location,
            phone_clay: phone,
            summary_clay: summary,
            raw_response: clayData
          });

        if (insertError) {
          console.error('Error inserting clay enrichment:', insertError);
        } else {
          console.log('Clay enrichment inserted successfully (replaced previous)');
        }
      } else {
        console.log('No lead found with email:', email);
      }
    }

    const response = {
      success: true,
      lead_updated: leadUpdated,
      lead_id: leadId,
      data: clayData
    };

    console.log('Final response:', JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
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
