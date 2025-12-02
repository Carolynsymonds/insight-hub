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

    // Build query: "Company Name" City State (facebook OR "facebook.com")
    const locationPart = [city, state].filter(Boolean).join(" ");
    const query = `"${company}" ${locationPart} (facebook OR "facebook.com")`;
    const encodedQuery = encodeURIComponent(query);
    const serpUrl = `https://serpapi.com/search.json?q=${encodedQuery}&num=10&api_key=${serpApiKey}`;

    console.log(`SerpAPI query: ${query}`);

    const response = await fetch(serpUrl);
    const data = await response.json();

    console.log(`SerpAPI response received`);

    let facebookUrl: string | null = null;

    // Search in organic results for Facebook URLs
    if (data.organic_results && Array.isArray(data.organic_results)) {
      for (const result of data.organic_results) {
        const link = result.link || "";
        if (link.includes("facebook.com")) {
          // Prefer company pages (not marketplace, groups, etc.)
          if (!link.includes("/marketplace/") && !link.includes("/groups/") && !link.includes("/events/")) {
            facebookUrl = link;
            console.log(`Found Facebook URL: ${facebookUrl}`);
            break;
          }
        }
      }
    }

    // Also check knowledge graph if available
    if (!facebookUrl && data.knowledge_graph) {
      const profiles = data.knowledge_graph.profiles || [];
      for (const profile of profiles) {
        if (profile.link && profile.link.includes("facebook.com")) {
          facebookUrl = profile.link;
          console.log(`Found Facebook URL in knowledge graph: ${facebookUrl}`);
          break;
        }
      }
    }

    // Update the lead in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ facebook: facebookUrl })
      .eq("id", leadId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Lead ${leadId} updated with Facebook: ${facebookUrl || "not found"}`);

    return new Response(
      JSON.stringify({
        success: true,
        facebook: facebookUrl,
        query: query,
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
