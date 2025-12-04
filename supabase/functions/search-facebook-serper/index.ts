import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrganicResult {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  favicon?: string;
  snippet?: string;
  snippet_highlighted_words?: string[];
  source?: string;
}

interface SearchStep {
  step: string;
  query: string;
  confidence: number;
  resultFound: boolean;
  facebookUrl?: string;
  organicResults?: OrganicResult[];
  totalResults?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, city, state, phone, micsSector } = await req.json();

    if (!leadId || !company) {
      throw new Error("Lead ID and company name are required");
    }

    const serpApiKey = Deno.env.get("SERPAPI_KEY");
    if (!serpApiKey) {
      throw new Error("SERPAPI_KEY not configured");
    }

    console.log(`=== Starting Facebook Search for: ${company} ===`);
    console.log(`Location: ${city || "N/A"}, ${state || "N/A"}`);
    console.log(`Phone: ${phone || "N/A"}`);
    console.log(`MICS Sector: ${micsSector || "N/A"}`);

    // Helper to find Facebook URL in search results
    const findFacebookUrl = (data: any): { url: string | null; organicResults: OrganicResult[]; totalResults: number } => {
      const organicResults: OrganicResult[] = [];
      let foundUrl: string | null = null;
      const totalResults = data.search_information?.total_results || 0;

      // Log and extract organic results
      if (data.organic_results && Array.isArray(data.organic_results)) {
        console.log(`Organic results count: ${data.organic_results.length}`);
        
        for (const result of data.organic_results) {
          const organicResult: OrganicResult = {
            position: result.position,
            title: result.title,
            link: result.link,
            displayed_link: result.displayed_link,
            favicon: result.favicon,
            snippet: result.snippet,
            snippet_highlighted_words: result.snippet_highlighted_words,
            source: result.source,
          };
          organicResults.push(organicResult);
          
          // Log each result
          console.log(`Result ${result.position}: ${result.title}`);
          console.log(`  Link: ${result.link}`);
          console.log(`  Snippet: ${result.snippet?.substring(0, 100)}...`);

          // Check if this is a valid Facebook URL
          const link = result.link || "";
          if (!foundUrl && link.includes("facebook.com")) {
            // Filter out non-company pages
            if (!link.includes("/marketplace/") && 
                !link.includes("/groups/") && 
                !link.includes("/events/") &&
                !link.includes("/watch/") &&
                !link.includes("/gaming/") &&
                !link.includes("/stories/")) {
              foundUrl = link;
            }
          }
        }
      }

      // Check knowledge graph profiles as fallback
      if (!foundUrl && data.knowledge_graph?.profiles) {
        for (const profile of data.knowledge_graph.profiles) {
          if (profile.link?.includes("facebook.com")) {
            foundUrl = profile.link;
            console.log(`Found in knowledge_graph.profiles: ${profile.link}`);
            break;
          }
        }
      }

      return { url: foundUrl, organicResults, totalResults };
    };

    // Execute a search query
    const executeSearch = async (query: string): Promise<any> => {
      console.log(`Executing search: ${query}`);
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=${serpApiKey}`;
      console.log(`API Request URL: https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=***`);
      const response = await fetch(url);
      return response.json();
    };

    // Prepare company name variations
    const companyNoPeriods = company.replace(/\./g, " ").replace(/\s+/g, " ").trim();
    const companyNoSpaces = company.replace(/\./g, "").replace(/\s+/g, "");
    
    // Clean phone number (remove non-digits)
    const phoneClean = phone ? phone.replace(/\D/g, "") : null;

    const searchSteps: SearchStep[] = [];
    let facebookUrl: string | null = null;
    let facebookConfidence: number = 0;

    // Step A: Full name + city + state + site:facebook.com (95%)
    if (!facebookUrl && city && state) {
      const query = `"${company}" "${city}" "${state}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "A", query, confidence: 95, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 95;
        console.log(`Step A: Found Facebook URL: ${result.url}`);
      }
    }

    // Step B: Full name + city (no state) + site:facebook.com (90%)
    if (!facebookUrl && city) {
      const query = `"${company}" "${city}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "B", query, confidence: 90, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 90;
        console.log(`Step B: Found Facebook URL: ${result.url}`);
      }
    }

    // Step C1: Name without periods + site:facebook.com (75%)
    if (!facebookUrl && city && companyNoPeriods !== company) {
      const query = `"${companyNoPeriods}" "${city}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "C1", query, confidence: 75, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 75;
        console.log(`Step C1: Found Facebook URL: ${result.url}`);
      }
    }

    // Step C2: Name with spaces removed + site:facebook.com (70%)
    if (!facebookUrl && city && companyNoSpaces !== company.replace(/\s+/g, "")) {
      const query = `"${companyNoSpaces}" "${city}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "C2", query, confidence: 70, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 70;
        console.log(`Step C2: Found Facebook URL: ${result.url}`);
      }
    }

    // Step D: Industry keyword + site:facebook.com (60%)
    if (!facebookUrl && micsSector && state) {
      const query = `"${company}" "${micsSector}" "${state}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "D", query, confidence: 60, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 60;
        console.log(`Step D: Found Facebook URL: ${result.url}`);
      }
    }

    // Step E1: Phone number (formatted) + site:facebook.com (85%)
    if (!facebookUrl && phoneClean && phoneClean.length >= 10) {
      const formattedPhone = phoneClean.length === 10 
        ? `${phoneClean.slice(0,3)}-${phoneClean.slice(3,6)}-${phoneClean.slice(6)}`
        : phoneClean;
      const query = `"${formattedPhone}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "E1", query, confidence: 85, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 85;
        console.log(`Step E1: Found Facebook URL: ${result.url}`);
      }
    }

    // Step E2: Phone with +1 prefix + site:facebook.com (80%)
    if (!facebookUrl && phoneClean && phoneClean.length === 10) {
      const query = `"+1${phoneClean}" site:facebook.com`;
      const data = await executeSearch(query);
      const result = findFacebookUrl(data);
      searchSteps.push({ 
        step: "E2", query, confidence: 80, 
        resultFound: !!result.url, 
        facebookUrl: result.url || undefined,
        organicResults: result.organicResults,
        totalResults: result.totalResults
      });
      if (result.url) {
        facebookUrl = result.url;
        facebookConfidence = 80;
        console.log(`Step E2: Found Facebook URL: ${result.url}`);
      }
    }

    console.log(`=== Search Complete ===`);
    console.log(`Facebook URL: ${facebookUrl || "Not found"}`);
    console.log(`Confidence: ${facebookConfidence}%`);
    console.log(`Steps executed: ${searchSteps.length}`);

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

    // Add Facebook search log
    const facebookSearchLog = {
      timestamp: new Date().toISOString(),
      action: "facebook_search_serper",
      searchParams: {
        company,
        city,
        state,
        phone,
        micsSector,
      },
      searchSteps,
      facebookUrl,
      confidence: facebookConfidence,
      source: "serpapi_facebook_search",
    };

    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        facebook: facebookUrl,
        facebook_confidence: facebookConfidence > 0 ? facebookConfidence : null,
        enrichment_logs: [...existingLogs, facebookSearchLog],
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
        searchSteps,
        stepsExecuted: searchSteps.length,
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
