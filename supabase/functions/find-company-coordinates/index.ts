import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, domain, sourceUrl } = await req.json();

    console.log('Find coordinates request:', { leadId, domain, sourceUrl });

    // Validate required fields
    if (!leadId || !domain) {
      throw new Error('Missing required fields: leadId, domain');
    }

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    if (!serpApiKey) {
      throw new Error('SERPAPI_KEY not configured');
    }

    // Use sourceUrl if available (more specific), otherwise fall back to domain
    const searchTerm = sourceUrl || domain;
    const searchQuery = `"${searchTerm}"`;
    console.log('Google Maps search query:', searchQuery, '(using sourceUrl:', !!sourceUrl, ')');

    // Call SerpAPI Google Maps engine
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}`;
    
    const response = await fetch(serpApiUrl);
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('SerpAPI response:', JSON.stringify(data));

    // Extract GPS coordinates - try place_results first, then local_results
    let latitude = data.place_results?.gps_coordinates?.latitude;
    let longitude = data.place_results?.gps_coordinates?.longitude;

    // If place_results not found, check local_results
    if (!latitude || !longitude) {
      if (data.local_results && data.local_results.length > 0) {
        latitude = data.local_results[0].gps_coordinates?.latitude;
        longitude = data.local_results[0].gps_coordinates?.longitude;
        console.log('Using coordinates from local_results[0]');
      }
    }

    if (!latitude || !longitude) {
      console.log('No GPS coordinates found in search results - setting to null/undefined');
      
      // Update lead with null coordinates and undefined confidence
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          latitude: null,
          longitude: null,
          distance_miles: null,
          distance_confidence: 'undefined'
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead with null coordinates:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          notFound: true,
          message: 'No GPS coordinates found for this company'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('GPS coordinates found:', { latitude, longitude });

    // Update lead with coordinates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        latitude: latitude,
        longitude: longitude
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log('Lead updated successfully with coordinates');

    return new Response(
      JSON.stringify({
        success: true,
        latitude: latitude,
        longitude: longitude,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in find-company-coordinates function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
