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
    const { leadId, city, state, zipcode, latitude, longitude } = await req.json();

    console.log('Calculate distance request:', { leadId, city, state, zipcode, latitude, longitude });

    // Validate required fields
    if (!leadId || !city || !zipcode || !latitude || !longitude) {
      throw new Error('Missing required fields: leadId, city, zipcode, latitude, longitude');
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    // Build request body for Routes API v2
    const requestBody = {
      origin: {
        address: `${city}, ${state || ''} ${zipcode}`.trim()
      },
      destination: {
        location: {
          latLng: {
            latitude: latitude,
            longitude: longitude
          }
        }
      },
      travelMode: "DRIVE"
    };

    console.log('Calling Google Routes API v2:', requestBody);

    // Call Google Routes API v2
    const mapsResponse = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes?key=${googleMapsApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!mapsResponse.ok) {
      throw new Error(`Google Routes API error: ${mapsResponse.status} ${mapsResponse.statusText}`);
    }

    const mapsData = await mapsResponse.json();
    console.log('Google Routes API response:', JSON.stringify(mapsData));

    if (mapsData.error) {
      throw new Error(`Google Routes API error: ${mapsData.error.message}`);
    }

    if (!mapsData.routes || mapsData.routes.length === 0) {
      throw new Error('No route found between origin and destination');
    }

    const route = mapsData.routes[0];
    const distanceMeters = route.distanceMeters;
    const distanceMiles = Math.round((distanceMeters / 1609.34) * 10) / 10;
    const duration = route.duration; // Format: "1234s"

    console.log('Distance calculated:', { distanceMeters, distanceMiles, duration });

    // Update lead with distance
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ distance_miles: distanceMiles })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log('Lead updated successfully with distance:', distanceMiles);

    return new Response(
      JSON.stringify({
        success: true,
        distance_miles: distanceMiles,
        duration: duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in calculate-distance function:', error);
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
