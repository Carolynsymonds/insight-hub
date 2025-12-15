import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrganicResult {
  position: number;
  title: string;
  link: string;
  redirect_link?: string;
  displayed_link?: string;
  favicon?: string;
  snippet?: string;
  snippet_highlighted_words?: string[];
  rich_snippet?: {
    top?: {
      extensions?: string[];
    };
  };
  source?: string;
}

// Extract clean Facebook profile URL from any Facebook URL
const extractFacebookProfile = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const normalizedHost = "facebook.com";
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      return `https://${normalizedHost}/${pathParts[0]}`;
    }
    return url;
  } catch {
    return url;
  }
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

    console.log(`=== Starting Facebook Search for: ${company} ===`);
    console.log(`Location: ${city || "N/A"}, ${state || "N/A"}`);

    // Build single query: Company name City State site:facebook.com
    const queryParts = [company];
    if (city) queryParts.push(city);
    if (state) queryParts.push(state);
    queryParts.push("site:facebook.com");
    
    const query = queryParts.join(" ");
    console.log(`Search query: ${query}`);

    // Execute search
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=${serpApiKey}`;
    console.log(`API Request URL: https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=***`);
    
    const response = await fetch(url);
    const data = await response.json();

    // Extract top 3 organic results with full JSON
    const top3Results: OrganicResult[] = [];
    let facebookUrl: string | null = null;
    let facebookSourceUrl: string | null = null;

    if (data.organic_results && Array.isArray(data.organic_results)) {
      console.log(`Total organic results: ${data.organic_results.length}`);
      
      for (let i = 0; i < Math.min(3, data.organic_results.length); i++) {
        const result = data.organic_results[i];
        const organicResult: OrganicResult = {
          position: result.position,
          title: result.title,
          link: result.link,
          redirect_link: result.redirect_link,
          displayed_link: result.displayed_link,
          favicon: result.favicon,
          snippet: result.snippet,
          snippet_highlighted_words: result.snippet_highlighted_words,
          rich_snippet: result.rich_snippet,
          source: result.source,
        };
        top3Results.push(organicResult);
        
        console.log(`Result ${result.position}: ${JSON.stringify(organicResult, null, 2)}`);

        // Find first valid Facebook URL
        const link = result.link || "";
        if (!facebookUrl && link.includes("facebook.com")) {
          if (!link.includes("/marketplace/") && 
              !link.includes("/groups/") && 
              !link.includes("/events/") &&
              !link.includes("/watch/") &&
              !link.includes("/gaming/") &&
              !link.includes("/stories/")) {
            facebookSourceUrl = link;
            facebookUrl = extractFacebookProfile(link);
          }
        }
      }
    }

    const facebookConfidence = facebookUrl ? 85 : 0;

    console.log(`=== Search Complete ===`);
    console.log(`Facebook URL (parsed): ${facebookUrl || "Not found"}`);
    console.log(`Facebook Source URL: ${facebookSourceUrl || "Not found"}`);

    // Update the lead in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing enrichment logs and diagnosis
    const { data: existingLead } = await supabase
      .from("leads")
      .select("enrichment_logs, diagnosis_category")
      .eq("id", leadId)
      .single();

    const existingLogs = existingLead?.enrichment_logs || [];

    // Add Facebook search log with top 3 results
    const facebookSearchLog = {
      timestamp: new Date().toISOString(),
      action: "facebook_search_serper",
      query,
      top3Results,
      facebookUrl,
      facebookSourceUrl,
      confidence: facebookConfidence,
      source: "serpapi_facebook_search",
    };

    // Update diagnosis to "Socials found" if we found a profile and current diagnosis indicates no domain
    const shouldUpdateDiagnosis = facebookUrl && 
      existingLead?.diagnosis_category === "Company doesn't exist / New company";

    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        facebook: facebookUrl,
        facebook_source_url: facebookSourceUrl,
        facebook_confidence: facebookConfidence > 0 ? facebookConfidence : null,
        enrichment_logs: [...existingLogs, facebookSearchLog],
        ...(shouldUpdateDiagnosis && { diagnosis_category: "Socials found" }),
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
        facebookSourceUrl,
        confidence: facebookConfidence > 0 ? facebookConfidence : null,
        query,
        top3Results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in search-facebook-serper:", error);
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
