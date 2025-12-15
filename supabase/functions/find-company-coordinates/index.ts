import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract address from Serper organic results
function extractAddressFromSerperResults(results: any[]): string | null {
  if (!results || results.length === 0) return null;

  // US state abbreviations and full names for matching
  const usStates = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;
  
  // Pattern for street addresses
  const streetPattern = /\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Ln|Lane|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway|Suite|Ste|#)\b[^,]*/i;
  
  // Pattern for ZIP codes
  const zipPattern = /\b\d{5}(?:-\d{4})?\b/;
  
  // Pattern for city, state zip
  const cityStateZipPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s*(\d{5}(?:-\d{4})?)?/i;

  for (const result of results) {
    const textsToCheck: string[] = [];
    
    // Priority 1: snippet_highlighted_words
    if (result.snippet_highlighted_words?.length > 0) {
      textsToCheck.push(result.snippet_highlighted_words.join(' '));
    }
    
    // Priority 2: snippet
    if (result.snippet) {
      textsToCheck.push(result.snippet);
    }
    
    // Priority 3: rich_snippet address
    if (result.rich_snippet?.top?.detected_extensions?.address) {
      textsToCheck.unshift(result.rich_snippet.top.detected_extensions.address);
    }

    for (const text of textsToCheck) {
      // Try to find a complete address pattern
      const streetMatch = text.match(streetPattern);
      const cityStateZipMatch = text.match(cityStateZipPattern);
      
      if (streetMatch && cityStateZipMatch) {
        const street = streetMatch[0].trim();
        const city = cityStateZipMatch[1];
        const state = cityStateZipMatch[2];
        const zip = cityStateZipMatch[3] || '';
        
        // Format: Street, City, State ZIP, US
        const address = `${street}, ${city}, ${state}${zip ? ' ' + zip : ''}, US`;
        console.log('Extracted address from snippet:', address);
        return address;
      }
      
      // Fallback: Look for any address-like pattern with state
      if (usStates.test(text)) {
        // Try to extract a reasonable address segment
        const addressSegmentPattern = /(\d+[^,]+,\s*[^,]+,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(?:\s*\d{5}(?:-\d{4})?)?)/i;
        const segmentMatch = text.match(addressSegmentPattern);
        if (segmentMatch) {
          const address = `${segmentMatch[1].trim()}, US`;
          console.log('Extracted address segment:', address);
          return address;
        }
      }
    }
  }

  return null;
}

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
    console.log('serpApiUrl:', serpApiUrl);
    
    const response = await fetch(serpApiUrl);
    
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "SerpAPI account has hit its request quota. Please try again later.",
            rateLimited: true,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('SerpAPI response:', JSON.stringify(data));

    // Extract GPS coordinates - try place_results first, then local_results
    let latitude = data.place_results?.gps_coordinates?.latitude;
    let longitude = data.place_results?.gps_coordinates?.longitude;
    let sourceUsed = 'Google Maps Direct';

    // If place_results not found, check local_results
    if (!latitude || !longitude) {
      if (data.local_results && data.local_results.length > 0) {
        latitude = data.local_results[0].gps_coordinates?.latitude;
        longitude = data.local_results[0].gps_coordinates?.longitude;
        console.log('Using coordinates from local_results[0]');
      }
    }

    // ===== FALLBACK: Serper Address Search =====
    if (!latitude || !longitude) {
      console.log('No GPS coordinates from initial Maps search - trying Serper address fallback...');
      
      // FALLBACK STEP 1: Google Search for address
      const serperSearchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(domain + ' address')}&api_key=${serpApiKey}`;
      console.log('Serper fallback search URL:', serperSearchUrl);
      
      const serperResponse = await fetch(serperSearchUrl);
      
      if (serperResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "SerpAPI account has hit its request quota. Please try again later.",
            rateLimited: true,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (serperResponse.ok) {
        const serperData = await serperResponse.json();
        console.log('Serper fallback organic_results count:', serperData.organic_results?.length || 0);
        
        // FALLBACK STEP 2: Extract address from results
        const organicResults = serperData.organic_results || [];
        const extractedAddress = extractAddressFromSerperResults(organicResults);
        console.log('Extracted address:', extractedAddress);
        
        if (extractedAddress) {
          // FALLBACK STEP 3: Google Maps lookup with extracted address
          const mapsLookupUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(extractedAddress)}&api_key=${serpApiKey}`;
          console.log('Maps lookup with extracted address:', mapsLookupUrl);
          
          const mapsResponse = await fetch(mapsLookupUrl);
          
          if (mapsResponse.status === 429) {
            return new Response(
              JSON.stringify({
                error: "SerpAPI account has hit its request quota. Please try again later.",
                rateLimited: true,
              }),
              {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          if (mapsResponse.ok) {
            const mapsData = await mapsResponse.json();
            console.log('Maps lookup response:', JSON.stringify(mapsData));
            
            // Extract coordinates from this second Maps search
            latitude = mapsData.place_results?.gps_coordinates?.latitude 
              || mapsData.local_results?.[0]?.gps_coordinates?.latitude;
            longitude = mapsData.place_results?.gps_coordinates?.longitude 
              || mapsData.local_results?.[0]?.gps_coordinates?.longitude;
            
            if (latitude && longitude) {
              sourceUsed = 'Serper Fallback';
              console.log('Coordinates found via Serper fallback:', { latitude, longitude, extractedAddress });
            }
          }
        }
      }
    }

    // If still no coordinates after all attempts
    if (!latitude || !longitude) {
      console.log('No GPS coordinates found after all attempts - setting to null');
      sourceUsed = 'Serper Fallback — No Address Found';
      
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
          message: 'No GPS coordinates found for this company',
          sourceUsed
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('GPS coordinates found:', { latitude, longitude, sourceUsed });

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
        sourceUsed
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
