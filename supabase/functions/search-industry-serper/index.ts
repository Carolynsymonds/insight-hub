import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrganicResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
  displayed_link?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, dma } = await req.json();

    if (!leadId || !company) {
      throw new Error("Lead ID and company name are required");
    }

    const serpApiKey = Deno.env.get("SERPAPI_KEY");
    if (!serpApiKey) {
      throw new Error("SERPAPI_KEY not configured");
    }

    console.log(`=== Starting Industry Search for: ${company} ===`);
    console.log(`DMA: ${dma || "N/A"}`);

    // Build query: "<Company Name>" "<DMA>" what does this company do
    const queryParts = [`"${company}"`];
    if (dma) {
      queryParts.push(`"${dma}"`);
    }
    queryParts.push("what does this company do");
    
    const query = queryParts.join(" ");
    console.log(`Search query: ${query}`);

    // Execute search using SerpAPI
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=5&api_key=${serpApiKey}`;
    console.log(`API Request URL: https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=5&api_key=***`);
    
    const response = await fetch(url);
    const data = await response.json();

    // Extract top results
    const topResults: OrganicResult[] = [];
    let topSnippet: string | null = null;

    if (data.organic_results && Array.isArray(data.organic_results)) {
      console.log(`Total organic results: ${data.organic_results.length}`);
      
      for (let i = 0; i < Math.min(5, data.organic_results.length); i++) {
        const result = data.organic_results[i];
        const organicResult: OrganicResult = {
          position: result.position,
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          displayed_link: result.displayed_link,
        };
        topResults.push(organicResult);
        
        console.log(`Result ${result.position}: ${JSON.stringify(organicResult, null, 2)}`);

        // Store first snippet
        if (!topSnippet && result.snippet) {
          topSnippet = result.snippet;
        }
      }
    }

    console.log(`=== Search Complete ===`);
    console.log(`Top snippet: ${topSnippet || "Not found"}`);

    // Update the lead in the database with the snippet
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        industry_google_snippet: topSnippet,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Lead ${leadId} updated with industry_google_snippet`);

    return new Response(
      JSON.stringify({
        success: true,
        snippet: topSnippet,
        query,
        topResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in search-industry-serper:", error);
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
