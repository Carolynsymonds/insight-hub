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

// Extract username from source field like "Instagram · yorkexcavating"
const extractUsernameFromSource = (source: string): string | null => {
  if (!source) return null;
  const match = source.match(/^Instagram\s*·\s*(.+)$/i);
  return match ? match[1].trim() : null;
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

    console.log(`=== Starting Instagram Search for: ${company} ===`);
    console.log(`Location: ${city || "N/A"}, ${state || "N/A"}`);

    // Build single query: Company name City State site:instagram.com
    const queryParts = [company];
    if (city) queryParts.push(city);
    if (state) queryParts.push(state);
    queryParts.push("site:instagram.com");
    
    const query = queryParts.join(" ");
    console.log(`Search query: ${query}`);

    // Execute search
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=${serpApiKey}`;
    console.log(`API Request URL: https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=***`);
    
    const response = await fetch(url);
    const data = await response.json();

    // Extract top 3 organic results with full JSON
    const top3Results: OrganicResult[] = [];
    let instagramUrl: string | null = null;
    let instagramSourceUrl: string | null = null;

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

        // Find first Instagram username from source field
        if (!instagramUrl && result.source) {
          const username = extractUsernameFromSource(result.source);
          if (username) {
            instagramSourceUrl = result.link; // Keep original link for audit
            instagramUrl = `https://www.instagram.com/${username}`;
          }
        }
      }
    }

    const instagramConfidence = instagramUrl ? 85 : 0;

    console.log(`=== Search Complete ===`);
    console.log(`Instagram URL (parsed): ${instagramUrl || "Not found"}`);
    console.log(`Instagram Source URL: ${instagramSourceUrl || "Not found"}`);

    // Update the lead in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing enrichment logs
    const { data: existingLead } = await supabase
      .from("leads")
      .select("enrichment_logs")
      .eq("id", leadId)
      .single();

    const existingLogs = existingLead?.enrichment_logs || [];

    // Add Instagram search log with top 3 results
    const instagramSearchLog = {
      timestamp: new Date().toISOString(),
      action: "instagram_search_serper",
      query,
      top3Results,
      instagramUrl,
      instagramSourceUrl,
      confidence: instagramConfidence,
      source: "serpapi_instagram_search",
    };

    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        instagram: instagramUrl,
        instagram_source_url: instagramSourceUrl,
        instagram_confidence: instagramConfidence > 0 ? instagramConfidence : null,
        enrichment_logs: [...existingLogs, instagramSearchLog],
      })
      .eq("id", leadId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Lead ${leadId} updated with Instagram: ${instagramUrl || "not found"}`);

    return new Response(
      JSON.stringify({
        success: true,
        instagram: instagramUrl,
        instagramSourceUrl,
        confidence: instagramConfidence > 0 ? instagramConfidence : null,
        query,
        top3Results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in search-instagram-serper:", error);
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
