import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, city, state } = await req.json();

    if (!leadId || !company) {
      throw new Error("Lead ID and company name are required");
    }

    const serpApiKey = Deno.env.get("SERPAPI_KEY");
    if (!serpApiKey) {
      throw new Error("SERPAPI_KEY not configured");
    }

    console.log(`Searching Facebook page for: ${company}, ${city || ""}, ${state || ""}`);

    const findFacebookUrl = (data: any): string | null => {
      // Search in organic results for Facebook URLs
      if (data.organic_results && Array.isArray(data.organic_results)) {
        for (const result of data.organic_results) {
          const link = result.link || "";
          if (link.includes("facebook.com")) {
            // Prefer company pages (not marketplace, groups, etc.)
            if (!link.includes("/marketplace/") && !link.includes("/groups/") && !link.includes("/events/")) {
              return link;
            }
          }
        }
      }

      // Also check knowledge graph if available
      if (data.knowledge_graph) {
        const profiles = data.knowledge_graph.profiles || [];
        for (const profile of profiles) {
          if (profile.link && profile.link.includes("facebook.com")) {
            return profile.link;
          }
        }
      }

      return null;
    };

    let facebookUrl: string | null = null;
    let facebookConfidence: number = 0;
    let foundInStep: number | null = null;

    // STEP 1: Search with company + location + "company" keyword
    const locationPart = [city, state].filter(Boolean).join(" ");
    const step1Query = `"${company}" company ${locationPart} (facebook OR "facebook.com")`;
    console.log(`Step 1 query: ${step1Query}`);

    const step1Response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(step1Query)}&num=10&api_key=${serpApiKey}`);
    const step1Data = await step1Response.json();

    facebookUrl = findFacebookUrl(step1Data);
    if (facebookUrl) {
      facebookConfidence = 85;
      foundInStep = 1;
      console.log(`Step 1: Found Facebook URL: ${facebookUrl} (${facebookConfidence}% confidence)`);
    }

    // STEP 2: Fallback with company name only + "company" keyword
    if (!facebookUrl) {
      const step2Query = `"${company}" company (facebook OR "facebook.com")`;
      console.log(`Step 2 query: ${step2Query}`);

      const step2Response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(step2Query)}&num=10&api_key=${serpApiKey}`);
      const step2Data = await step2Response.json();

      facebookUrl = findFacebookUrl(step2Data);
      if (facebookUrl) {
        facebookConfidence = 50;
        foundInStep = 2;
        console.log(`Step 2: Found Facebook URL: ${facebookUrl} (${facebookConfidence}% confidence)`);
      }
    }

    // Update the lead in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        facebook: facebookUrl,
        facebook_confidence: facebookConfidence > 0 ? facebookConfidence : null
      })
      .eq("id", leadId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Lead ${leadId} updated with Facebook: ${facebookUrl || "not found"}`);

    return new Response(
      JSON.stringify({
        success: true,
        facebook: facebookUrl,
        confidence: facebookConfidence > 0 ? facebookConfidence : null,
        foundInStep: foundInStep,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in enrich-facebook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
