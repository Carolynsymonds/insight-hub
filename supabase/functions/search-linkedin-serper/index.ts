import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
}

interface SearchStep {
  step: string;
  query: string;
  confidence: number;
  resultFound: boolean;
  linkedinUrl?: string;
  linkedinSourceUrl?: string;
  organicResults?: OrganicResult[];
  totalResults?: number;
}

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
    const { leadId, company, city, state, micsSector } = await req.json();

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

    const searchSteps: SearchStep[] = [];
    let foundLinkedin: string | null = null;
    let foundLinkedinSourceUrl: string | null = null;
    let foundConfidence: number = 0;

    // Helper to find LinkedIn URL in results
    const findLinkedInUrl = (results: OrganicResult[]): { url: string; sourceUrl: string } | null => {
      for (const result of results) {
        if (result.link && result.link.includes("linkedin.com") && isCompanyPage(result.link)) {
          return { url: extractLinkedInProfile(result.link), sourceUrl: result.link };
        }
      }
      return null;
    };

    // Execute search
    const executeSearch = async (query: string): Promise<{ organicResults: OrganicResult[]; totalResults: number }> => {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://serpapi.com/search.json?q=${encodedQuery}&num=10&api_key=${serpApiKey}`;
      console.log(`API Request URL: ${url.replace(serpApiKey, "***")}`);

      const response = await fetch(url);
      const data = await response.json();

      const organicResults: OrganicResult[] = (data.organic_results || []).map((r: any) => ({
        position: r.position,
        title: r.title,
        link: r.link,
        displayed_link: r.displayed_link,
        favicon: r.favicon,
        snippet: r.snippet,
      }));

      console.log(`Organic results count: ${organicResults.length}`);
      organicResults.forEach((r, i) => {
        console.log(`Result ${i + 1}: ${r.title}`);
        console.log(`  Link: ${r.link}`);
        console.log(`  Snippet: ${r.snippet?.substring(0, 100)}...`);
      });

      return { organicResults, totalResults: data.search_information?.total_results || 0 };
    };

    // Step A: Full search with company + city + state
    if (!foundLinkedin && city && state) {
      const query = `"${company}" "${city}" "${state}" site:linkedin.com/company`;
      console.log(`Executing search: ${query}`);
      const { organicResults, totalResults } = await executeSearch(query);
      const found = findLinkedInUrl(organicResults);
      
      const step: SearchStep = {
        step: "A",
        query,
        confidence: 95,
        resultFound: !!found,
        organicResults,
        totalResults,
      };

      if (found) {
        foundLinkedin = found.url;
        foundLinkedinSourceUrl = found.sourceUrl;
        foundConfidence = 95;
        step.linkedinUrl = found.url;
        step.linkedinSourceUrl = found.sourceUrl;
        console.log(`Step A: Found LinkedIn URL: ${found.sourceUrl} -> Parsed: ${found.url}`);
      }
      searchSteps.push(step);
    }

    // Step B: Company + city only
    if (!foundLinkedin && city) {
      const query = `"${company}" "${city}" site:linkedin.com/company`;
      console.log(`Executing search: ${query}`);
      const { organicResults, totalResults } = await executeSearch(query);
      const found = findLinkedInUrl(organicResults);

      const step: SearchStep = {
        step: "B",
        query,
        confidence: 90,
        resultFound: !!found,
        organicResults,
        totalResults,
      };

      if (found) {
        foundLinkedin = found.url;
        foundLinkedinSourceUrl = found.sourceUrl;
        foundConfidence = 90;
        step.linkedinUrl = found.url;
        step.linkedinSourceUrl = found.sourceUrl;
        console.log(`Step B: Found LinkedIn URL: ${found.sourceUrl} -> Parsed: ${found.url}`);
      }
      searchSteps.push(step);
    }

    // Step C1: Company name without periods + city
    if (!foundLinkedin && city) {
      const cleanCompany = company.replace(/\./g, "");
      if (cleanCompany !== company) {
        const query = `"${cleanCompany}" "${city}" site:linkedin.com/company`;
        console.log(`Executing search: ${query}`);
        const { organicResults, totalResults } = await executeSearch(query);
        const found = findLinkedInUrl(organicResults);

        const step: SearchStep = {
          step: "C1",
          query,
          confidence: 75,
          resultFound: !!found,
          organicResults,
          totalResults,
        };

        if (found) {
          foundLinkedin = found.url;
          foundLinkedinSourceUrl = found.sourceUrl;
          foundConfidence = 75;
          step.linkedinUrl = found.url;
          step.linkedinSourceUrl = found.sourceUrl;
          console.log(`Step C1: Found LinkedIn URL: ${found.sourceUrl} -> Parsed: ${found.url}`);
        }
        searchSteps.push(step);
      }
    }

    // Step C2: Company name without spaces + city
    if (!foundLinkedin && city) {
      const compactCompany = company.replace(/\s+/g, "");
      const query = `"${compactCompany}" "${city}" site:linkedin.com/company`;
      console.log(`Executing search: ${query}`);
      const { organicResults, totalResults } = await executeSearch(query);
      const found = findLinkedInUrl(organicResults);

      const step: SearchStep = {
        step: "C2",
        query,
        confidence: 70,
        resultFound: !!found,
        organicResults,
        totalResults,
      };

      if (found) {
        foundLinkedin = found.url;
        foundLinkedinSourceUrl = found.sourceUrl;
        foundConfidence = 70;
        step.linkedinUrl = found.url;
        step.linkedinSourceUrl = found.sourceUrl;
        console.log(`Step C2: Found LinkedIn URL: ${found.sourceUrl} -> Parsed: ${found.url}`);
      }
      searchSteps.push(step);
    }

    // Step D: Company + industry sector + state
    if (!foundLinkedin && micsSector && state) {
      const query = `"${company}" "${micsSector}" "${state}" site:linkedin.com/company`;
      console.log(`Executing search: ${query}`);
      const { organicResults, totalResults } = await executeSearch(query);
      const found = findLinkedInUrl(organicResults);

      const step: SearchStep = {
        step: "D",
        query,
        confidence: 60,
        resultFound: !!found,
        organicResults,
        totalResults,
      };

      if (found) {
        foundLinkedin = found.url;
        foundLinkedinSourceUrl = found.sourceUrl;
        foundConfidence = 60;
        step.linkedinUrl = found.url;
        step.linkedinSourceUrl = found.sourceUrl;
        console.log(`Step D: Found LinkedIn URL: ${found.sourceUrl} -> Parsed: ${found.url}`);
      }
      searchSteps.push(step);
    }

    // Step E: Company name only (broadest search)
    if (!foundLinkedin) {
      const query = `"${company}" site:linkedin.com/company`;
      console.log(`Executing search: ${query}`);
      const { organicResults, totalResults } = await executeSearch(query);
      const found = findLinkedInUrl(organicResults);

      const step: SearchStep = {
        step: "E",
        query,
        confidence: 50,
        resultFound: !!found,
        organicResults,
        totalResults,
      };

      if (found) {
        foundLinkedin = found.url;
        foundLinkedinSourceUrl = found.sourceUrl;
        foundConfidence = 50;
        step.linkedinUrl = found.url;
        step.linkedinSourceUrl = found.sourceUrl;
        console.log(`Step E: Found LinkedIn URL: ${found.sourceUrl} -> Parsed: ${found.url}`);
      }
      searchSteps.push(step);
    }

    // Log results
    console.log("=== Search Complete ===");
    console.log(`Steps executed: ${searchSteps.length}`);
    console.log(`LinkedIn URL (parsed): ${foundLinkedin}`);
    console.log(`LinkedIn Source URL: ${foundLinkedinSourceUrl}`);
    console.log(`Confidence: ${foundConfidence}%`);

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

    // Create new log entry
    const newLog = {
      action: "linkedin_search_serper",
      timestamp: new Date().toISOString(),
      source: "serpapi_linkedin_search",
      confidence: foundConfidence,
      linkedinUrl: foundLinkedin,
      linkedinSourceUrl: foundLinkedinSourceUrl,
      searchSteps,
      searchParams: { company, city, state, micsSector },
    };

    // Update lead record
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        linkedin: foundLinkedin,
        linkedin_confidence: foundConfidence,
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
        confidence: foundConfidence,
        searchSteps,
        stepsExecuted: searchSteps.length,
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
