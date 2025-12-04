import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract clean LinkedIn company profile URL
function extractLinkedInProfile(url: string): string {
  try {
    // Remove protocol and www
    let cleaned = url.replace(/^https?:\/\//, "").replace(/^(www\.|m\.)?/, "");
    
    // Parse to extract company name from path like linkedin.com/company/york-excavating/about
    const match = cleaned.match(/linkedin\.com\/company\/([^\/\?]+)/i);
    if (match) {
      return `https://linkedin.com/company/${match[1]}`;
    }
    
    // Fallback - return cleaned URL
    return `https://${cleaned.split("?")[0].split("#")[0]}`;
  } catch {
    return url;
  }
}

// Filter out non-company LinkedIn URLs
function isCompanyPage(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  // Must contain /company/ path
  if (!lowerUrl.includes("/company/")) return false;
  // Exclude job posts, events, etc.
  if (lowerUrl.includes("/jobs/") || lowerUrl.includes("/posts/") || lowerUrl.includes("/events/")) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, city, state } = await req.json();

    if (!leadId || !company) {
      return new Response(
        JSON.stringify({ error: "leadId and company are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serpApiKey = Deno.env.get("SERPAPI_KEY");
    if (!serpApiKey) {
      throw new Error("SERPAPI_KEY not configured");
    }

    console.log(`=== Starting LinkedIn Search for: ${company} ===`);
    console.log(`Location: ${city}, ${state}`);

    // Single search query: "Company" "City" "State" site:linkedin.com/company
    const query = `"${company}" "${city || ""}" "${state || ""}" site:linkedin.com/company`.replace(/\s+/g, " ").trim();
    console.log(`Search query: ${query}`);

    const encodedQuery = encodeURIComponent(query);
    const url = `https://serpapi.com/search.json?q=${encodedQuery}&num=10&api_key=${serpApiKey}`;
    console.log(`API Request URL: ${url.replace(serpApiKey, "***")}`);

    const response = await fetch(url);
    const data = await response.json();

    const organicResults = data.organic_results || [];
    console.log(`Total organic results: ${organicResults.length}`);

    // Get top 3 results with full JSON
    const top3Results = organicResults.slice(0, 3).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      redirect_link: r.redirect_link,
      displayed_link: r.displayed_link,
      favicon: r.favicon,
      snippet: r.snippet,
      snippet_highlighted_words: r.snippet_highlighted_words,
      rich_snippet: r.rich_snippet,
      source: r.source,
    }));

    // Log each result
    top3Results.forEach((result: any, idx: number) => {
      console.log(`Result ${idx + 1}: ${JSON.stringify(result, null, 2)}`);
    });

    // Find first LinkedIn company URL
    let foundLinkedin: string | null = null;
    let foundLinkedinSourceUrl: string | null = null;
    const foundConfidence = 95;

    for (const result of organicResults) {
      if (result.link && result.link.includes("linkedin.com") && isCompanyPage(result.link)) {
        foundLinkedinSourceUrl = result.link;
        foundLinkedin = extractLinkedInProfile(result.link);
        console.log(`LinkedIn Source URL: ${foundLinkedinSourceUrl}`);
        console.log(`LinkedIn URL (parsed): ${foundLinkedin}`);
        break;
      }
    }

    console.log("=== Search Complete ===");

    // Save to database
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

    // Create new log entry with query and top3Results
    const newLog = {
      action: "linkedin_search_serper",
      timestamp: new Date().toISOString(),
      source: "serpapi_linkedin_search",
      confidence: foundLinkedin ? foundConfidence : 0,
      linkedinUrl: foundLinkedin,
      linkedinSourceUrl: foundLinkedinSourceUrl,
      query,
      top3Results,
      searchParams: { company, city, state },
    };

    // Update lead record
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        linkedin: foundLinkedin,
        linkedin_confidence: foundLinkedin ? foundConfidence : 0,
        linkedin_source_url: foundLinkedinSourceUrl,
        enrichment_logs: [...existingLogs, newLog],
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log(`Lead ${leadId} updated with LinkedIn: ${foundLinkedin}`);

    return new Response(
      JSON.stringify({
        success: true,
        linkedin: foundLinkedin,
        linkedinSourceUrl: foundLinkedinSourceUrl,
        confidence: foundLinkedin ? foundConfidence : 0,
        query,
        top3Results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in search-linkedin-serper:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
