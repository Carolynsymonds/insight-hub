import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, latitude, longitude } = await req.json();

    if (!leadId || latitude == null || longitude == null) {
      return new Response(
        JSON.stringify({ error: "leadId, latitude, and longitude are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Places API (New) - Nearby Search
    const url = `https://places.googleapis.com/v1/places:searchNearby`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.types,places.businessStatus",
      },
      body: JSON.stringify({
        includedTypes: ["establishment"],
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: 30.0,
          },
        },
      }),
    });
    const data = await response.json();

    if (data.error) {
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.error.status}`, error_message: data.error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = data.places || [];

    const commercialTypes = [
      "store", "office", "warehouse", "finance", "point_of_interest",
      "establishment", "shopping_mall", "restaurant", "food", "gym",
      "health", "lodging", "car_dealer", "car_repair", "gas_station",
      "bank", "accounting", "insurance_agency", "lawyer", "real_estate_agency",
    ];

    let classification = "residential";
    let nearbyBusinessName: string | null = null;
    let nearbyTypes: string[] = [];

    for (const place of results) {
      const types: string[] = place.types || [];
      const hasCommercialType = types.some((t: string) => commercialTypes.includes(t));
      const isOperational = place.businessStatus === "OPERATIONAL" || !place.businessStatus;

      if (hasCommercialType && isOperational) {
        classification = "commercial";
        nearbyBusinessName = place.displayName?.text || null;
        nearbyTypes = types;
        break;
      }
    }

    // Save to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("leads")
      .update({ address_classification: classification })
      .eq("id", leadId);

    return new Response(
      JSON.stringify({
        classification,
        nearby_business_name: nearbyBusinessName,
        nearby_types: nearbyTypes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
